# First Owner Setup

This is a one-time, privileged setup step for the DOLFish Control Center.

## Current security model

- Dashboard sign-in uses Supabase Auth.
- Authorization reads the trusted `app_metadata.role` claim.
- Only `owner` and `admin` can read project/provider inventory.
- Never put a Supabase secret/service-role key in browser code, GitHub, or this repository.
- Never assign roles through `user_metadata`; users can edit that field themselves.

## First owner provisioning

The first owner must be provisioned through a trusted server-side Supabase Admin API operation. The Admin API's `updateUserById` can write `app_metadata`, and must only run on a server with the service-role credential.

1. Open the deployed Control Center and create/sign in to the intended account.
2. Confirm the email address is verified in Supabase Authentication → Users.
3. Provision that exact user ID as `app_metadata: { role: "owner" }` using a trusted administrator-only process.
4. Sign out and sign in again (or refresh the session) so the JWT includes the updated app metadata.
5. Confirm the dashboard loads `cc_projects` and `cc_provider_connections` from Supabase.
6. Confirm a second account without an approved role cannot read either table.

Do not create a public "claim owner" endpoint. Do not let a browser-supplied email, user ID, or role decide who becomes owner. A secure bootstrap flow must authenticate the current user, enforce a preconfigured owner allowlist or one-time secret stored outside source control, and be disabled after successful bootstrap.

## Verification

- Security Advisor should have no lints.
- RLS must remain enabled on all `public.cc_*` tables.
- Authorization policies must continue to use trusted `auth.jwt()->'app_metadata'->>'role'`.
- The dashboard may show demo inventory to unauthorized users, but must not expose live database rows.
- Secret values belong in a dedicated vault or provider environment variables. The database stores references only.


## Session refresh

After the trusted administrator updates `app_metadata.role`, the user can sign out and sign in again. The dashboard also includes a **Refresh access** action that requests a fresh Supabase session so the latest trusted app metadata can be loaded. This action does not grant or change any role.

## Current project-specific status

- The configured Supabase project is active and its three Control Center tables have RLS enabled.
- No Auth user was found for the intended owner email during the last account check. The owner must first create and verify their account.
- No owner role has been assigned by this repository or dashboard.
- Do not add a browser-side role editor or public role-claim endpoint.


## Audit function verification (2026-11-16)

- Edge Function `cc-audit-write` is deployed and ACTIVE (version 1) with platform JWT verification enabled.
- The function validates the caller's token with Supabase Auth, checks trusted `app_metadata.role` for `owner` or `admin`, and derives `actor_user_id` from the verified Auth user.
- The function writes audit rows server-side. Do not grant direct browser INSERT access to `cc_audit_events`.
- The function has not yet had a successful owner/admin insert test because the intended owner account was not found in `auth.users` at the latest check.

### Finish the owner test

1. In the dashboard, create an account using the intended owner email and complete email verification.
2. In Supabase Dashboard → Authentication → Users, locate that exact verified account and copy its user ID.
3. Use a trusted administrator-only Admin API process to set `app_metadata.role = "owner"`. Never use SQL from the browser, `user_metadata`, or a public claim endpoint for this.
4. Sign out and sign back in (or use **Refresh access**).
5. Invoke `cc-audit-write` from the authenticated client with a harmless test event, for example:
   `{ action: "security.owner_access_test", target_type: "system", target_id: "control-center", details: { test: true } }`.
6. Confirm HTTP 201 and that the event appears in the Audit Events panel.
7. Sign in with a separate account that has no trusted role and confirm the function returns HTTP 403. An unauthenticated call should be rejected by JWT verification.

Do not share passwords, access tokens, publishable/secret API keys, or service-role credentials in chat. The successful owner and non-owner tests are required before marking Phase 2 complete.

## Audit payload safety
- `cc-audit-write` version 2 rejects audit detail objects containing sensitive-looking field names such as `token`, `secret`, `password`, `api_key`, `authorization` or `credential`.
- It also rejects private-key PEM blocks and bearer-token strings in detail values, and rejects excessive nesting.
- Audit details should contain identifiers, action summaries and non-sensitive metadata only. Never include raw provider responses or secret material.
