import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("CC_CONTROL_CENTER_ORIGIN") || "";
const headers = (origin: string | null) => ({
  ...(allowedOrigin && origin === allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  "Content-Type": "application/json", "Cache-Control": "no-store"
});
const reply = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: headers(req.headers.get("Origin")) });
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function decryptSecret(ciphertext: string, iv: string) {
  const master = Deno.env.get("CC_VAULT_MASTER_KEY");
  if (!master || master.length < 32) throw new Error("Vault key unavailable");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(master));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv) }, key, decode(ciphertext));
  return new TextDecoder().decode(clear);
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    if (!allowedOrigin || origin !== allowedOrigin) return new Response(null, { status: 403, headers: headers(origin) });
    return new Response("ok", { headers: headers(origin) });
  }
  if (req.method !== "POST") return reply(req, { error: "POST required" }, 405);
  if (!allowedOrigin || origin !== allowedOrigin) return reply(req, { error: "Origin not allowed" }, 403);
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) throw new Error("Supabase configuration unavailable");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) return reply(req, { error: "Unauthorized" }, 401);
    if (userData.user.app_metadata?.role !== "owner") return reply(req, { error: "Owner access required" }, 403);
    const body = await req.json().catch(() => null);
    if (!body || !["projects", "deployments"].includes(body.action)) return reply(req, { error: "Supported actions: projects, deployments" }, 400);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: rows, error } = await admin.from("cc_secret_vault")
      .select("ciphertext,iv").eq("provider", "vercel").eq("secret_name", "VERCEL_TOKEN")
      .order("updated_at", { ascending: false }).limit(1);
    if (error) throw error;
    if (!rows?.length) return reply(req, { error: "VERCEL_TOKEN is not registered in the encrypted vault." }, 409);
    const token = await decryptSecret(rows[0].ciphertext, rows[0].iv);
    const endpoint = body.action === "projects"
      ? "https://api.vercel.com/v9/projects?limit=100"
      : "https://api.vercel.com/v6/deployments?limit=50";
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!response.ok) {
      console.error("Vercel API read failed", response.status);
      return reply(req, { error: "Vercel API request failed", status: response.status }, response.status === 401 ? 401 : 502);
    }
    const result = await response.json();
    if (body.action === "projects") {
      const items = (result.projects || []).map((p: any) => ({
        id: p.id, name: p.name, framework: p.framework || null,
        updatedAt: p.updatedAt || null, createdAt: p.createdAt || null,
        link: p.link ? { type: p.link.type, org: p.link.org, repo: p.link.repo, productionBranch: p.link.productionBranch } : null
      }));
      return reply(req, { provider: "vercel", mode: "read-only", count: items.length, projects: items });
    }
    const deployments = (result.deployments || []).map((d: any) => ({
      id: d.uid, name: d.name, url: d.url ? `https://${d.url}` : null,
      state: d.state, target: d.target || null, createdAt: d.createdAt || null,
      meta: { githubCommitSha: d.meta?.githubCommitSha || null, githubCommitRef: d.meta?.githubCommitRef || null }
    }));
    return reply(req, { provider: "vercel", mode: "read-only", count: deployments.length, deployments });
  } catch (error) {
    console.error("cc-vercel-readonly error", error instanceof Error ? error.message : "Unknown error");
    return reply(req, { error: "Vercel read-only operation failed. Check vault setup and provider token." }, 500);
  }
});