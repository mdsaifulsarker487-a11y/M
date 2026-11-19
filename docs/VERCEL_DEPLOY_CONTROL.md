# Vercel Deploy / Redeploy Control

## Scope
- Owner-only Supabase Edge Function: `cc-vercel-deploy` (JWT verification enabled).
- Redeploys an existing deployment only, using Vercel REST API `POST /v13/deployments` with `deploymentId`.
- Before starting, verifies the source deployment via `GET /v13/deployments/{id}`.
- Preserves inherited project settings and deployment target; does not create arbitrary source deployments, promote, rollback, cancel, or delete.
- Production target requires an explicit `confirm_production: true` request and a second UI checkbox plus confirmation dialog.
- Reads `VERCEL_TOKEN` from the encrypted vault and decrypts only server-side.
- Exact-origin allowlist uses `CC_CONTROL_CENTER_ORIGIN`; no wildcard CORS.
- Audit event records IDs, project, target and resulting deployment metadata only. No token or environment values are logged or stored in audit details.

## Required setup
Configure `CC_VAULT_MASTER_KEY`, `CC_CONTROL_CENTER_ORIGIN`, and an owner-only vault entry with provider `vercel` and secret name `VERCEL_TOKEN`. Never paste credentials into chat.

## UI
Enter an existing Vercel deployment ID beginning `dpl_`. The function verifies it with Vercel before starting a redeployment. Production requires the explicit checkbox. The UI does not show or transmit secret values.

## Limitations
No live action test is possible until owner auth, vault master key, exact origin, and Vercel token are configured. This control starts a real deployment when invoked; use it only after reviewing the deployment ID and target.
