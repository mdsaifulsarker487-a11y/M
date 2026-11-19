import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("CC_CONTROL_CENTER_ORIGIN") || "";
const corsHeaders = (origin: string | null) => ({
  ...(allowedOrigin && origin === allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin", "Content-Type": "application/json", "Cache-Control": "no-store"
});
const respond = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(req.headers.get("Origin")) });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
async function vaultKey() {
  const raw = Deno.env.get("CC_VAULT_MASTER_KEY");
  if (!raw || raw.length < 32) throw new Error("Vault master key is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
}
async function encryptSecret(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vaultKey(), new TextEncoder().encode(secret));
  return { ciphertext: b64(new Uint8Array(encrypted)), iv: b64(iv) };
}
async function audit(admin: ReturnType<typeof createClient>, userId: string, action: string, targetId: string, details: Record<string, unknown>) {
  const { error } = await admin.from("cc_audit_events").insert({ actor_user_id: userId, action, target_type: "secret_vault", target_id: targetId, details });
  if (error) throw new Error("Audit write failed");
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    if (!allowedOrigin || origin !== allowedOrigin) return new Response(null, { status: 403, headers: corsHeaders(origin) });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return respond(req, { error: "POST required" }, 405);
  if (!allowedOrigin || origin !== allowedOrigin) return respond(req, { error: "Origin not allowed. Configure CC_CONTROL_CENTER_ORIGIN." }, 403);
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) throw new Error("Supabase function configuration unavailable");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return respond(req, { error: "Unauthorized" }, 401);
    if (userData.user.app_metadata?.role !== "owner") return respond(req, { error: "Owner access required" }, 403);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return respond(req, { error: "Invalid request body" }, 400);
    if (body.action === "list") {
      const { data, error } = await admin.from("cc_secret_vault").select("id,project_id,provider,integration_name,environment_scope,secret_name,masked_hint,created_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return respond(req, { items: data || [] });
    }
    if (body.action === "set") {
      const fields = ["project_id", "provider", "integration_name", "environment_scope", "secret_name", "secret_value"];
      if (fields.some(key => typeof body[key] !== "string" || !body[key].trim())) return respond(req, { error: "Missing required fields" }, 400);
      if (body.secret_value.length > 10000) return respond(req, { error: "Secret too long" }, 400);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.project_id)) return respond(req, { error: "Invalid project id" }, 400);
      const encrypted = await encryptSecret(body.secret_value);
      const payload = { project_id: body.project_id, provider: body.provider.trim().slice(0,80), integration_name: body.integration_name.trim().slice(0,120), environment_scope: body.environment_scope.trim().slice(0,30), secret_name: body.secret_name.trim().slice(0,120), ciphertext: encrypted.ciphertext, iv: encrypted.iv, masked_hint: typeof body.masked_hint === "string" ? body.masked_hint.slice(0,100) : null, created_by: userData.user.id, updated_by: userData.user.id };
      const { data, error } = await admin.from("cc_secret_vault").upsert(payload, { onConflict: "project_id,provider,integration_name,environment_scope,secret_name" }).select("id").single();
      if (error) throw error;
      await audit(admin, userData.user.id, "secret_vault_upserted", data.id, { provider: payload.provider, integration_name: payload.integration_name, environment_scope: payload.environment_scope, secret_name: payload.secret_name });
      return respond(req, { ok: true, message: "Secret encrypted and stored. Plaintext is not returned." });
    }
    if (body.action === "delete") {
      if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return respond(req, { error: "Valid secret id required" }, 400);
      const { data: existing, error: readError } = await admin.from("cc_secret_vault").select("id,provider,integration_name,environment_scope,secret_name").eq("id", body.id).maybeSingle();
      if (readError) throw readError;
      if (!existing) return respond(req, { error: "Secret not found" }, 404);
      const { error } = await admin.from("cc_secret_vault").delete().eq("id", body.id);
      if (error) throw error;
      await audit(admin, userData.user.id, "secret_vault_deleted", body.id, { provider: existing.provider, integration_name: existing.integration_name, environment_scope: existing.environment_scope, secret_name: existing.secret_name });
      return respond(req, { ok: true });
    }
    return respond(req, { error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("cc-secret-vault error", error instanceof Error ? error.message : "Unknown error");
    return respond(req, { error: "Vault operation failed. Check server configuration and audit storage." }, 500);
  }
});