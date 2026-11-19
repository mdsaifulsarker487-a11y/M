# Netlify Read-only Integration

Supabase Edge Function: `cc-netlify-readonly` (JWT verification enabled).
- Owner-only; validates Supabase user and `app_metadata.role=owner`.
- Exact-origin allowlist via `CC_CONTROL_CENTER_ORIGIN`; no wildcard CORS.
- Decrypts `NETLIFY_TOKEN` from `cc_secret_vault` server-side only.
- Fixed Netlify API reads: `GET /api/v1/sites?per_page=100` and `GET /api/v1/sites/{site_id}/deploys?per_page=10`.
- Site UUID validated before deploy-history lookup.
- Returns reduced metadata only; no token, environment variables or secret values.
- No deployment mutations, environment writes, arbitrary URL fetches, or secret logging.

Vault entry: provider `netlify`, secret name `NETLIFY_TOKEN`. Configure the token in the encrypted vault; never commit it or paste it into chat.
Live test still requires the vault master key, exact Control Center origin, owner Auth role and Netlify token.
