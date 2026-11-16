# Phase 5 — Controlled Operations Queue

## Delivered
- Added `cc_operation_requests` for deploy, restart, rollback, secret rotation, provider change and other operational requests.
- Authorized owner/admin users can submit a request with a target and rationale.
- Requests begin in `pending` state and are visible only to owner/admin roles.
- Browser clients cannot update or delete requests.
- Added the `cc-operation-review` Edge Function. It verifies the caller's Supabase JWT and requires the trusted `app_metadata.role = owner` for approval or rejection.
- Review results are written server-side and corresponding audit events are recorded.
- Added the Operations page form, request queue and owner-only Approve/Reject controls.

## Safety boundary
- This is a request and approval workflow only.
- Approval does not execute a deployment, restart, rollback, secret rotation or provider configuration change.
- No production mutation is performed by this phase.
- Actual execution requires provider-specific credentials, minimum scopes, action-specific safeguards, idempotency and live end-to-end tests.
- Secrets must never be pasted into ChatGPT, browser code, SQL rows or GitHub.

## Verification still required
- Owner account and trusted owner role are not yet provisioned.
- Authenticated request submission, approval/rejection and audit writes have not yet been smoke-tested.

## Order 2 hardening
- Operation review now runs through `cc_review_operation_request`, a database transaction that locks the pending request, changes its review state and inserts the audit event atomically.
- The RPC is executable only by `service_role`; browser roles `anon` and `authenticated` cannot call it directly.
- `cc-operation-review` Edge Function version 2 calls the transaction after verifying a signed-in owner from trusted `app_metadata`.
- Operation request creation calls `cc-audit-write`; the UI reports if the audit write cannot be confirmed.
- Supabase migration filenames in the repository are aligned with the deployed migration versions.
- Security and Health Advisors returned no lints after this change. Performance Advisor reports only informational unused-index notices because the tables have not yet accumulated production traffic.
