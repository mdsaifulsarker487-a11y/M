# Server-side audit logging

The Supabase Edge Function `cc-audit-write` is deployed to project `onfpkfrdzpahcitqcdlw`.

## Security controls
- The function requires a valid Supabase user JWT at the platform gateway (`verify_jwt=true)).
- It independently resolves the user with Auth `getUser(token)`.
- Authorization is read only from trusted `user.app_metadata.role`; accepted roles are `owner` and `admin`.
- The actor ID is taken from the verified Auth user, never from the request body.
- Only the function uses the server-side `SUPABASE_SERVICE_ROLE_KEY` to insert into `cc_audit_events`. It is never included in browser code or repository configuration.
- Request fields are type/length checked and details are limited to 8 KB.
- Database RLS continues to allow audit reads only to owner/admin and does not grant browser insert permission.

## Endpoint
`POST https://onfpkfrdzpahcitqcdlw.supabase.co/functions/v1/cc-audit-write`

Call it from an authenticated client with `supabase.functions.invoke("cc-audit-write", { body: { action, target_type, target_id, details } })`. The Supabase client supplies the current session JWT and publishable API key.

Example body:
```json
{
  "action": "provider.connection.updated",
  "target_type": "provider",
  "target_id": "github",
  "details": { "status": "connected" }
}
```

## Important operational rule
Write an event only after the corresponding protected operation has succeeded. Do not use client-submitted audit events as proof that an operation occurred. As provider-management operations are implemented, move the operation and its audit insert into the same trusted server-side function/transaction where practical. Never send secret values, passwords, access tokens, or raw credentials in `details`.

## Status and testing
- Deployment status reported ACTIVE, version 1, JWT verification enabled.
- No owner/admin account has been confirmed yet, so a successful authorized insert has not been tested.
- Missing/invalid JWT and non-owner/admin roles are rejected by the function's controls; verify these with test accounts after owner provisioning.
