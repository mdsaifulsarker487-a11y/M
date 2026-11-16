# First Owner Setup

This is a one-time privileged setup step for the DOLFish Control Center.

## Current security model

- Dashboard sign-in uses Supabase Auth.
- Authorization reads the trusted `app_metadata.role` claim.
- Only `owner` and `admin` can read project/provider inventory.
- Only the owner can approve or reject controlled operation requests.
- Never put a Supabase secret/service-role key in browser code, GitHub or this repository.
- Never assign roles through `user_metadata`; users can edit that field themselves.

## First owner provisioning

1. Open the deployed Control Center and create/sign in to the intended account.
2. Confirm the email address is verified in Supabase Authentication → Users.
3. Provision that exact user ID through a trusted administrator-only Supabase Admin API process with `app_metadata: { role: "owner" }`.
4. Sign out and sign in again, or refresh the session, so the JWT includes the updated app metadata.
5. Confirm the dashboard loads live records from Supabase.
6. Test a second account without an approved role and confirm privileged data remains inaccessible.

Do not create a public "claim owner" endpoint. Do not let a browser-supplied email, user ID or role decide who becomes owner. Never share passwords, access tokens or service-role credentials in chat.

## Edge Functions deployed

| Function | Version | JWT verification |
|---|---:|---|
| `cc-audit-write` | 2 | Enabled |
| `cc-provider-health` | 3 | Enabled |
| `cc-operation-review` | 3 | Enabled |

### Audit writer

- Validates the caller's JWT with Supabase Auth.
- Requires trusted `app_metadata.role` of `owner` or `admin`.
- Derives the actor user ID from the verified Auth user.
- Rejects sensitive-looking audit keys, bearer-token strings, private-key PEM blocks and excessive nesting.
- Browser clients must not receive direct INSERT access to `cc_audit_events`.

### Provider health checks

- Requires a verified owner/admin session.
- Uses fixed read-only provider endpoints; it does not accept arbitrary URLs.
- Reads provider credentials only from server-side Supabase Edge Function Secrets.
- Missing credentials are reported as `not_configured`, not as successful connections.
- A successful probe confirms only the tested endpoint, not the full provider integration.

### Operation review

- Requires a verified owner session.
- Calls the service-role-only `cc_review_operation_request` RPC.
- The request status update and audit insert are performed in one database transaction.
- Approval/rejection changes request state only; it does not execute production actions.

## Finish owner and authorization tests

1. Create and verify the intended owner account.
2. In Supabase Authentication → Users, locate that exact verified account and copy its user ID.
3. Use a trusted administrator-only Admin API process to set `app_metadata.role = "owner"`.
4. Sign out and sign back in, or use **Refresh access**.
5. Invoke `cc-audit-write` from the authenticated client with a harmless test event, for example:

   ```json
   {
     "action": "security.owner_access_test",
     "target_type": "system",
     "target_id": "control-center",
     "details": { "test": true }
   }
   ```

6. Confirm HTTP 201 and that the event appears in the Audit Events panel.
7. Submit a harmless operation request and confirm it appears in the queue.
8. As owner, approve or reject that request and confirm both status and audit event are written.
9. Sign in with a separate account without a trusted role and confirm privileged data and Edge Function actions are denied.

## Database verification

- All six `public.cc_*` tables must retain RLS.
- Authorization policies must continue to use trusted `auth.jwt()->'app_metadata'->>'role'`.
- `cc_review_operation_request` must remain SECURITY DEFINER with an empty search_path and EXECUTE granted only to service_role.
- Browser clients must not UPDATE/DELETE operation requests or directly insert audit/health records.

## Provider secret configuration

Configure only the providers you intend to probe, using Supabase Dashboard → Edge Functions → Secrets. See the provider secret-name table in the repository README. Use least-privilege read-only credentials and rotate them through the provider's supported process. Never place values in this document, SQL migrations, browser storage or GitHub.

## Known launch blockers at last verification

- The intended owner email had no Auth user in the last database check; no owner role has been assigned.
- Owner/non-owner end-to-end tests have not been completed.
- The live deployed website has not had a complete browser smoke test.
- Continuous monitoring and production operation execution adapters are not implemented.

These are explicit launch gates; do not describe the dashboard as production-ready until they are closed.
