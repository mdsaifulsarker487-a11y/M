# Order 4 — Final Hardening and Handover

Date: 2026-11-16

## Completed in Order 4

- Fixed the Bearer-token parser in `cc-operation-review`. The prior regular expression looked for a literal backslash sequence instead of whitespace after the Bearer scheme.
- Committed the fix and deployed `cc-operation-review` as ACTIVE version 3 with platform JWT verification enabled.
- Rewrote README implementation/security/launch status to remove stale contradictory provider-health claims.
- Updated first-owner setup documentation with current Edge Function versions, review transaction model, provider probe limitations and explicit launch gates.
- Bumped the PWA cache to `dolfish-control-center-v031`.

## Verification performed

- Supabase Security Advisor: no lints.
- Supabase Health Advisor: no lints.
- Six `public.cc_*` tables inspected; RLS enabled on all six.
- Edge Functions reported ACTIVE:
  - `cc-audit-write`: v2, JWT verification enabled.
  - `cc-provider-health`: v3, JWT verification enabled.
  - `cc-operation-review`: v3, JWT verification enabled.
- Nine database migrations listed and aligned with the versioned repository migrations.

## Still blocked / not claimed as complete

- The intended owner Auth user was absent at the last check. No owner role was assigned.
- Owner and non-owner end-to-end authorization tests remain outstanding.
- No live browser smoke test was performed in this order.
- Provider health probes are manual point-in-time checks, not continuous uptime monitoring.
- Provider probes need credentials configured in Supabase Edge Function Secrets; a successful probe verifies only its fixed API endpoint.
- Operation approvals record a decision only. They do not execute deploy/restart/rollback/secret-rotation actions.
- Scheduled monitoring, alerting, execution adapters, idempotency and rollback safeguards remain future work.

## Safe handover sequence

1. Create and verify the intended owner account in Supabase Auth.
2. Have a trusted administrator assign `app_metadata.role = "owner"` to that exact Auth user ID.
3. Sign in again and test the audit writer, provider health checks and operation request review.
4. Test an ordinary account and confirm it cannot access privileged records or functions.
5. Configure required provider secrets with minimum read-only scopes.
6. Run mobile and desktop browser smoke tests before considering launch.

Never share passwords, JWTs, provider secrets or the Supabase service-role key in chat or source control.
