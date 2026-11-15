# Backend & Authentication foundation

## Current state
- Website is currently a static frontend; authentication is NOT active.
- No Supabase project has been selected or activated for this Control Center.
- No provider credentials or API secret values are stored here.
- Previously visible Supabase projects were inactive; this change does not restore or modify them.

## Target architecture
1. Supabase Auth handles sign-in and session lifecycle.
2. Trusted server-side administration assigns app_metadata.role (owner, admin, viewer). Never authorize from user-editable user_metadata.
3. Postgres Row Level Security protects project/provider metadata.
4. A server-side API performs privileged actions and writes audit events.
5. Secret values remain in a dedicated secret manager or hosting environment variables. Database stores references only.

## Required setup before enabling login
1. Owner selects an active Supabase project or explicitly approves creating one.
2. Configure project URL and publishable key in the frontend build environment.
3. Configure server-only credentials in the backend host secret environment. Never expose a service-role/secret key to browsers or commit it to Git.
4. Review and apply ../supabase/schema.sql to the selected project.
5. Create the first owner account and assign its role through a trusted server-side admin process.
6. Implement and test server-side authorization, session handling and audit writes before public exposure.

See ../.env.example for blank variable names.
