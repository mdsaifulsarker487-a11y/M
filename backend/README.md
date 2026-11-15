# Backend & Authentication

## Current state
- Supabase project `onfpkfrdzpahcitqcdlw` is active in Tokyo (`ap-northeast-1`).
- Initial schema is deployed and verified; RLS is enabled on all Control Center tables.
- Email/password sign-in and sign-up UI is wired to Supabase Auth using the publishable key.
- First owner role is not yet assigned. Until trusted `app_metadata.role` is assigned, RLS intentionally blocks management data.
- No provider secret values are stored in the database or frontend.

## Target architecture
1. Supabase Auth handles sign-in and session lifecycle.
2. Trusted server-side administration assigns `app_metadata.role` (owner, admin, viewer). Never authorize from user-editable `user_metadata`.
3. Postgres RLS protects project/provider metadata.
4. A server-side API performs privileged actions and writes audit events.
5. Secret values remain in a dedicated secret manager or hosting environment variables. Database stores references only.

## Required before production
1. Assign the first owner role using a trusted server-side Supabase admin process.
2. Verify login, role claims, and RLS for owner/admin/non-admin accounts.
3. Implement server-side audit writes and provider APIs.
4. Configure production redirect URLs and email delivery.
5. Add monitoring, backups, and least-privilege provider credentials.

The browser publishable key is public by design. Never expose a secret/service-role key.
