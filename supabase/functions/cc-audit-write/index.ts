import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "method_not_allowed" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "missing_user_token" });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishableKey || !serviceRoleKey) {
      console.error("Required Supabase function environment is unavailable.");
      return respond(500, { error: "server_configuration_error" });
    }

    const token = authorization.slice("Bearer ".length);
    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return respond(401, { error: "invalid_user_token" });

    const trustedRole = user.app_metadata?.role;
    if (!["owner", "admin"].includes(trustedRole)) return respond(403, { error: "insufficient_role" });

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return respond(400, { error: "invalid_json_body" });

    const { action, target_type, target_id = null, details = {} } = payload;
    if (typeof action !== "string" || action.trim().length < 2 || action.length > 100) return respond(400, { error: "invalid_action" });
    if (typeof target_type !== "string" || target_type.trim().length < 2 || target_type.length > 80) return respond(400, { error: "invalid_target_type" });
    if (target_id !== null && (typeof target_id !== "string" || target_id.length > 160)) return respond(400, { error: "invalid_target_id" });
    if (!details || typeof details !== "object" || Array.isArray(details)) return respond(400, { error: "invalid_details" });
    if (JSON.stringify(details).length > 8000) return respond(413, { error: "details_too_large" });

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: inserted, error: insertError } = await adminClient
      .from("cc_audit_events")
      .insert({ actor_user_id: user.id, action: action.trim(), target_type: target_type.trim(), target_id, details })
      .select("id, action, target_type, target_id, created_at")
      .single();

    if (insertError) {
      console.error("Audit insert failed:", insertError.message);
      return respond(500, { error: "audit_write_failed" });
    }
    return respond(201, { ok: true, event: inserted });
  } catch (error) {
    console.error("Audit function request failed:", error instanceof Error ? error.message : "unknown");
    return respond(400, { error: "invalid_request" });
  }
});
