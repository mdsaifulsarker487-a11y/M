# Phase 3 — Provider Integration Registry

## Delivered
- Added `cc_provider_catalog` as a provider capability and authorization registry.
- Seeded ten integrations: GitHub, GitLab, Vercel, Render, Railway, Netlify, Cloudflare, Supabase, Cloudinary and Google Cloud Secret Manager.
- Recorded each provider's authentication pattern, minimum initial access, supported first capabilities, official docs URL and connection strategy.
- Enabled RLS. Owner/admin can read the catalog; only owner can manage catalog rows.
- Infrastructure page reads and renders the catalog from Supabase for authorized users.

## Integration safety model
1. Start with read-only metadata access.
2. Use provider-specific OAuth/App installations or narrowly scoped tokens.
3. Keep provider secrets in the provider's secret store or a dedicated vault; store only a reference in Control Center.
4. Never expose service tokens to browser JavaScript.
5. Do not display a provider as connected until a credential has been authorized and a server-side health check succeeds.
6. Add write/deploy/restart actions only after approval checks and server-side audit logging are in place.

## Important status distinction
The catalog is a plan/registry, not proof that any provider account is connected. Real OAuth/API credentials and user approval are still required for live integrations.

## Health checks delivered
- Added `cc_provider_health_checks` to store timestamped provider check results, latency, HTTP status and a safe message.
- RLS permits owner/admin reads; browser roles cannot insert or modify health records.
- Deployed `cc-provider-health` Edge Function (ACTIVE, JWT verification enabled). It verifies the caller and trusted `app_metadata.role` before checking a provider.
- Supabase check performs a real Auth health endpoint probe. Other providers return `not_configured` until server-side credentials are provisioned; no fake success is reported.
- Infrastructure registry includes a Check action and displays the latest saved result.

## Read-only provider probes
The deployed health function now supports authenticated read-only identity probes for:
- GitHub: `CC_GITHUB_TOKEN` → `GET https://api.github.com/user`
- GitLab: `CC_GITLAB_TOKEN` → `GET https://gitlab.com/api/v4/user`
- Vercel: `CC_VERCEL_TOKEN` → `GET https://api.vercel.com/v2/user`
- Cloudflare: `CC_CLOUDFLARE_TOKEN` → `GET /client/v4/user/tokens/verify`
- Netlify: `CC_NETLIFY_TOKEN` → `GET /api/v1/user`
- Supabase: existing Auth health probe (uses project runtime configuration).

Each probe runs server-side only after verifying the Supabase user and trusted owner/admin role. Missing secrets are reported as `not_configured`; non-success provider responses are not marked healthy. Render, Railway, Cloudinary and Google Cloud Secret Manager now also have server-side read-only probes. Required optional secret names are documented below.

Configure optional credentials in Supabase Edge Function Secrets (Edge Functions → Secrets):
- `CC_GITHUB_TOKEN`
- `CC_GITLAB_TOKEN`
- `CC_VERCEL_TOKEN`
- `CC_CLOUDFLARE_TOKEN`
- `CC_NETLIFY_TOKEN`
- `CC_RENDER_API_KEY`
- `CC_RAILWAY_API_TOKEN`
- `CC_CLOUDINARY_CLOUD_NAME`, `CC_CLOUDINARY_API_KEY`, `CC_CLOUDINARY_API_SECRET`
- `CC_GCP_ACCESS_TOKEN`, `CC_GCP_PROJECT_ID`

The GCP token should be short-lived and limited to Secret Manager read-only access. Do not paste tokens into ChatGPT, browser code, SQL tables or GitHub.

## Test limitation
A live authenticated health-check call has not yet been run because the owner account/role is still not provisioned. The function and database table are deployed.

## Next batch
- Implement GitHub read-only integration using the existing approved GitHub connection.
- Add a server-side provider credential reference and health-check contract.
- Then integrate one hosting provider (Render or Vercel) using read-only scopes.
