# DOLFish Control Center

Internal DOLFish ecosystem management dashboard.

## Current implementation
- Responsive dark dashboard, English/Bangla toggle, project search and PWA foundation.
- Supabase project restored and active: `onfpkfrdzpahcitqcdlw` (Tokyo).
- Database schema deployed: `cc_projects`, `cc_provider_connections`, `cc_audit_events`.
- RLS enabled on all three tables; initial security advisor check returned no lints.
- Six DOLFish project records and ten provider metadata records seeded.
- Supabase email/password sign-in and sign-up UI added. Owner/admin authorization is not yet assigned or verified.

## Security
- Browser uses only the Supabase publishable key; this key is designed for public clients.
- Never put a Supabase secret/service-role key in frontend code or GitHub.
- Provider secret values are not stored in Postgres. `secret_reference` is for vault references only.
- RLS authorization reads trusted `app_metadata.role`, never user-editable `user_metadata`.
- Do not enable provider operations until server-side authorization and audit logging are complete.

## Next
1. Create/confirm the owner's Auth account and assign its trusted `app_metadata.role=owner` securely.
2. Verify sign-in, role-gated reads and RLS denial for non-admin accounts.
3. Add server-side functions for audit writes and provider integration management.
4. Connect providers one at a time with least-privilege credentials.
