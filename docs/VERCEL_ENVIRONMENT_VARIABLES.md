# Vercel environment variable manager

## Delivered
- Supabase Edge Function: `cc-vercel-env`, deployed ACTIVE with JWT verification.
- Owner-only actions: `env_list`, `env_create`, `env_update` (Vercel upsert), `env_delete`.
- Uses the encrypted vault entry with provider `vercel` and secret name `VERCEL_TOKEN`.
- Token decryption occurs only inside the Edge Function. Environment variable values are never returned by list responses and are not logged.
- UI supports listing metadata, creating, upserting an existing key, and deleting a variable.
- Project selection currently requires the Vercel project ID (`prj_...`).

## Security boundaries
- Only authenticated Supabase users with `app_metadata.role = owner` are accepted.
- Exact-origin allowlist uses `CC_CONTROL_CENTER_ORIGIN`.
- Project ID, variable key, target environment and value length are validated.
- Target environments accepted: production, preview, development.
- New variables are created with type `encrypted`.
- Update uses Vercel's documented POST /v10/projects/{idOrName}/env?upsert=true behavior. Confirm the key and project carefully before updating; the old value is replaced.
- Delete requires an explicit browser confirmation.
- No arbitrary URL, shell, or generic HTTP proxy is exposed.

## Setup and testing prerequisites
1. Configure `CC_VAULT_MASTER_KEY` and `CC_CONTROL_CENTER_ORIGIN` in Supabase Edge Function Secrets.
2. Store a least-privilege Vercel token in the encrypted vault: provider `vercel`, secret name exactly `VERCEL_TOKEN`.
3. The token must have the Vercel project environment-variable read/write permission required by the selected actions.
4. Sign in as the configured Control Center owner and use the Vercel project ID from Vercel.
5. Test list first, then create a disposable test variable, verify it appears without exposing its value, update it, and delete it.

## Not yet verified
- No live environment-variable operation was run: no vault master key, origin, owner session, or Vercel token has been confirmed configured in this workspace.
- Vercel API token scopes and project-specific permissions must be verified against the account's token configuration.
- The UI is committed to GitHub; deployment of the static site depends on its connected hosting pipeline.
