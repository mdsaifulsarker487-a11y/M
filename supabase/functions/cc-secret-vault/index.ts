import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

async function vaultKey() {
  const raw = Deno.env.get("CC_VAULT_MASTER_KEY");
  if (!raw || raw.length < 32) throw new Error("Vault key not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
}
async function encryptSecret(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await vaultKey();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
  return { ciphertext: b64(new Uint8Array(encrypted)), iv: b64(iv) };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
    if (userData.user.app_metadata?.role !== "owner") return json({ error: "Owner access required" }, 403);
    const admin = createClient(url, service);
    const body = await req.json();
    if (body?.action === "list") {
      const { data, error } = await admin.from("cc_secret_vault").select("id,project_id,provider,integration_name,environment_scope,secret_name,masked_hint,created_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return json({ items: data || [] });
    }
    if (body?.action === "set") {
      const required = ["project_id", "provider", "integration_name", "environment_scope", "secret_name", "secret_value"];
      if (required.some(k => typeof body[k] !== "string" || !body[k].trim())) return json({ error: "Missing required fields" }, 400);
      if (body.secret_value.length > 10000) return json({ error: "Secret too long" }, 400);
      const encrypted = await encryptSecret(body.secret_value);
      const payload = { project_id: body.project_id, provider: body.provider, integration_name: body.integration_name, environment_scope: body.environment_scope, secret_name: body.secret_name, ciphertext: encrypted.ciphertext, iv: encrypted.iv, masked_hint: typeof body.masked_hint === "string" ? body.masked_hint.slice(0, 100) : null, created_by: userData.user.id, updated_by: userData.user.id };
      const { error } = await admin.from("cc_secret_vault").upsert(payload, { onConflict: "project_id,provider,integration_name,environment_scope,secret_name" });
      if (error) throw error;
      return json({ ok: true, message: "Secret encrypted and stored. Plaintext is not returned." });
    }
    if (body?.action === "delete") {
      if (typeof body.id !== "string") return json({ error: "Secret id required" }, 400);
      const { error } = await admin.from("cc_secret_vault").delete().eq("id", body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("cc-secret-vault error", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Vault operation failed. Check server configuration." }, 500);
  }
});