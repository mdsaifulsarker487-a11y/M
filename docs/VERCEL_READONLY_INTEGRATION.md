# Vercel read-only integration

## Status
- Authenticated Vercel account/team access verified; team slug: `saiful-s-projects3`, Hobby plan.
- Six projects were returned by the account's read-only project listing.
- Supabase Edge Function `cc-vercel-readonly` deployed, version 1, JWT verification enabled.
- Actions: `projects` and `deployments`.
- Fixed Vercel API base and fixed GET endpoints only; no arbitrary URL input.
- The function decrypts `VERCEL_TOKEN` only server-side from `cc_secret_vault`; plaintext is never returned.
- Responses contain reduced non-secret project/deployment metadata.

## Required setup
1. Configure `CC_VAULT_MASTER_KEY` and `CC_CONTROL_CENTER_ORIGIN` in Supabase Edge Function Secrets.
2. Save a Vercel token in the encrypted vault with provider `vercel` and secret name exactly `VERCEL_TOKEN`.
3. Use a least-privilege read-only Vercel token for this phase. Never paste it into ChatGPT or commit it.
4. Verify owner access and test both actions from the authenticated Control Center.

## Boundaries and gaps
- Read-only only: no environment-variable writes, deployments, project settings changes, or mutations.
- No Vercel token has been added or tested as part of this deployment.
- Account-side Vercel connector verification does not mean a token exists in the Control Center vault.
- Current limits: 100 projects and 50 deployments per request; pagination is not implemented.
- Live tests remain blocked until secure secrets, origin, owner identity and token are configured.
