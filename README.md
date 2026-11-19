# DOLFish Control Center

Internal DOLFish ecosystem management dashboard. It is a control plane for project inventory, provider metadata, point-in-time health probes, audit events and controlled operation requests. It does not replace the individual projects' own applications or backends.

## Current implementation

- Responsive dark dashboard, English/Bangla toggle and PWA foundation.
- Supabase project: `onfpkfrdzpahcitqcdlw` (Tokyo, ap-northeast-1).
- Six ecosystem projects and ten provider catalog records.
- Six `public.cc_*` tables; RLS is enabled on all six.
- Supabase email/password sign-in. Trusted authorization uses `app_metadata.role`, never user-editable `user_metadata`.
- Server-side audit writer validates owner/admin identity and rejects sensitive-looking audit details.
- Provider health function supports read-only probes for Supabase and configured GitHub, GitLab, Vercel, Cloudflare, Netlify, Render, Railway, Cloudinary and Google Cloud Secret Manager credentials.
- Monitoring shows recorded point-in-time health checks; it does not claim continuous uptime or synthetic availability.
- Controlled operations queue supports request submission and owner approval/rejection. Approval records intent only; it does not deploy, restart, roll back or rotate secrets.
- Operation review uses a server-side transactional RPC so the status change and audit event commit or roll back together.

## API & Infrastructure Manager (new foundation)

- A project-linked `cc_api_integrations` registry is deployed.
- Records contain provider metadata, secret references, masked hints, environment scope and status — not raw API keys.
- RLS is enabled. Owner/admin can read registry records; owner-only writes.
- Target hosting integrations: Vercel, Netlify, Railway, Cloudflare and Render.
- UI, credential vault workflow, provider adapters, environment-variable actions and deploy controls are not yet implemented.
- See [API & Infrastructure Manager plan](docs/API_INFRASTRUCTURE_MANAGER.md).

## Security boundaries

- Browser code contains only the Supabase URL and publishable key.
- Never commit Supabase service-role credentials or provider secrets.
- Provider secret values are not stored in Postgres. The dashboard database stores metadata and vault references only.
- Provider credentials belong in Supabase Edge Function Secrets (or a dedicated vault). The health function reads them server-side.
- The health probes are read-only and use fixed provider endpoints; do not turn them into arbitrary URL fetchers.
- RLS policies and Edge Functions authorize using trusted `app_metadata.role`.
- Do not add a public owner-claim endpoint or browser-side role editor.
- Operation approvals are not execution permission for an external production system. Execution adapters, idempotency, rollback and per-action audit controls are still required.

## Provider health secrets

Only configure credentials for providers that should be probed. Use Supabase Dashboard → Edge Functions → Secrets. Never paste secret values into chat, SQL, browser storage or GitHub.

| Provider | Edge Function secret names |
|---|---|
| GitHub | `CC_GITHUB_TOKEN` |
| GitLab | `CC_GITLAB_TOKEN` |
| Vercel | `CC_VERCEL_TOKEN` |
| Cloudflare | `CC_CLOUDFLARE_TOKEN` |
| Netlify | `CC_NETLIFY_TOKEN` |
| Render | `CC_RENDER_API_KEY` |
| Railway | `CC_RAILWAY_API_TOKEN` |
| Cloudinary | `CC_CLOUDINARY_CLOUD_NAME`, `CC_CLOUDINARY_API_KEY`, `CC_CLOUDINARY_API_SECRET` |
| Google Cloud Secret Manager | `CC_GCP_ACCESS_TOKEN`, `CC_GCP_PROJECT_ID` |
| Supabase | Uses the function's own project URL and publishable key |

Use minimum read-only scopes. A successful identity/API probe confirms only that the tested endpoint accepted the credential; it does not prove every integration capability is configured.

## Edge Functions

| Function | Deployed version | JWT verification |
|---|---:|---|
| `cc-audit-write` | 2 | Enabled |
| `cc-provider-health` | 3 | Enabled |
| `cc-operation-review` | 3 | Enabled |

## Monitoring limitations

- Manual provider checks create timestamped history records.
- Latest status counts are based on the most recent stored result per provider.
- No fabricated uptime percentage, SLA, latency trend or continuous alerting is shown.
- Scheduled polling, alert delivery and external observability ingestion remain future work.

## Owner setup and launch gate

See [First Owner Setup](docs/FIRST_OWNER_SETUP.md). The intended owner account must be created and email-verified, then provisioned by a trusted administrator with `app_metadata.role = "owner"`. The last account check found no Auth user for the intended owner email, so owner-only end-to-end tests remain outstanding.

Before launch:
1. Provision the first owner securely and sign in again to refresh the JWT.
2. Verify owner access, audit writes and operation approval.
3. Verify a normal authenticated account is denied privileged reads and writes.
4. Configure only the required provider secrets and test each provider independently.
5. Test the deployed website on mobile and desktop.
6. Keep production operation execution disabled until dedicated server-side adapters and safeguards are reviewed.

## Current completion boundary

The foundation, database/RLS, provider registry, manual health-check infrastructure and controlled request/review queue are implemented. Authentication acceptance testing, actual provider integrations beyond read-only probes, continuous monitoring, production operation execution and final live-browser launch testing are not complete.
