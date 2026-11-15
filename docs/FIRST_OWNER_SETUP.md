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
