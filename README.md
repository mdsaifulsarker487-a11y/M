# DOLFish Control Center

Internal DOLFish ecosystem management dashboard foundation.

## Frontend
Responsive dark dashboard with Overview, Projects, APIs & Secrets, Infrastructure, Monitoring, Security, Operations and Documentation; English/Bangla toggle; project search; PWA manifest and basic service-worker caching.

## Security
This is currently a static preview, not a production admin console. Authentication and server-side authorization are not active. No API secret values or live provider metrics are stored.

## Backend foundation
- backend/README.md: target architecture and setup checklist.
- supabase/schema.sql: initial tables and RLS policy draft; NOT applied to a database.
- .env.example: variable names only; no credentials.

## Next
Select/activate a Supabase project, configure Auth and server-side authorization, apply and verify the schema, then connect providers individually. Do not enable operational actions until authorization and audit logging are verified.
