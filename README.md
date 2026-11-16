# DOLFish Control Center

Internal DOLFish ecosystem management dashboard.

## Current implementation
- Responsive dark dashboard, English/Bangla toggle, project search and PWA foundation.
- Supabase project restored and active: `onfpkfrdzpahcitqcdlw` (Tokyo).
- Database schema deployed: `cc_projects`, `cc_provider_connections`, `cc_audit_events`.
- RLS enabled on all three tables; latest security and health advisor checks returned no lints.
- Six DOLFish project records and ten provider metadata records seeded.
- Supabase email/password sign-in and sign-up UI added. Owner/admin authorization is not yet assigned or verified.
- Server-side `cc-audit-write` Edge Function deployed with JWT verification and trusted `app_metadata.role` checks.

## Security
- Browser uses only the Supabase publishable key; this key is designed for public clients.
- Never put a Supabase secret/service-role key in frontend code or GitHub.
- Provider secret values are not stored in Postgres. `secret_reference` is for vault references only.
- RLS and the audit function authorize from trusted `app_metadata.role`, never user-editable `user_metadata`.
- Audit write function is deployed, but authorized end-to-end insert testing awaits owner provisioning.
- Do not enable provider operations until each operation and its audit write are implemented server-side.

- Provider catalog deployed with 10 providers, approved auth methods, initial least-privilege scopes, capabilities and official documentation links.
- Provider catalog RLS enabled; read access is owner/admin and management is owner-only.
- Infrastructure view now renders the live provider integration registry for authorized users.

- Provider health-check history table deployed with privileged read-only RLS.
- Server-side `cc-provider-health` Edge Function deployed with JWT verification and trusted owner/admin role checks. It probes Supabase Auth health; other providers explicitly return `not_configured` until credentials are securely connected.
- Infrastructure registry includes a per-provider Check action and latest health result display.

- Provider health history table and server-side `cc-provider-health` function deployed (JWT + trusted role checks).
- Supabase Auth plus GitHub, GitLab, Vercel, Cloudflare and Netlify server-side read-only health probes are implemented. Provider tokens remain optional Edge Function secrets; no credentials are stored in browser or DB.
- Infrastructure UI has per-provider Check controls and health history display.

- Read-only health probes now cover all ten catalog providers; credentials remain server-side Supabase Edge Function secrets.
- Provider health function source is versioned under `supabase/functions/cc-provider-health/`.

## Next
1. Create/confirm the owner's Auth account and assign its trusted `app_metadata.role=owner` securely.
2. Verify sign-in, role-gated reads, audit writes and RLS denial for non-admin accounts.
3. Add server-side functions for provider integration management.
4. Connect providers one at a time with least-privilege credentials.

## Phase 4 — Monitoring foundation
- Monitoring page now reads the latest 20 real provider health-check records for authorized owner/admin users.
- Summary counts are calculated from each provider's latest recorded check; historical checks are shown separately.
- Manual refresh reloads database records. No synthetic uptime, availability percentage, or latency trend is presented.
- These are point-in-time provider probes, not continuous service monitoring. Continuous uptime, error-rate and usage telemetry require connected hosting/observability sources.

- Phase 4 monitoring foundation added: authorized users can review latest provider health history and refresh results; continuous uptime polling is not yet enabled.
- Phase 4 performance hardening adds the health-check actor index and separates provider catalog owner write policies from privileged reads.

- Phase 5 controlled operations queue added: owner/admin requests, owner-only approval/rejection, and server-side audit trail. Approvals do not execute production actions yet.
