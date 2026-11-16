# Phase 4 — Monitoring Foundation

## Delivered
- Monitoring view reads the latest 20 recorded provider health checks for authorized owner/admin users.
- Summary counts use the latest recorded check per provider and distinguish healthy, unhealthy, not configured and error.
- History rows show provider, check timestamp, HTTP status, latency when available, and the safe result message.
- Manual refresh reloads the latest records from Supabase.
- No synthetic uptime, availability percentage, error rate or latency trend is displayed.

## Data and limitations
- The health history is point-in-time data created when an authorized user runs a provider Check action.
- It is not continuous uptime monitoring and does not automatically poll providers.
- Continuous monitoring requires scheduled probes and connected hosting/observability sources.
- The health history table remains read-only to browser clients; only the server-side health function writes results.
- The dashboard requires a trusted `app_metadata.role` of `owner` or `admin`.

## Database hardening
- Added an index for `cc_provider_health_checks.checked_by`.
- Replaced the provider catalog's broad owner ALL policy with separate owner INSERT, UPDATE and DELETE policies.
- Kept the privileged SELECT policy separate so admins can read without receiving write access.
- All authorization checks use trusted app metadata and wrapped JWT function calls.
