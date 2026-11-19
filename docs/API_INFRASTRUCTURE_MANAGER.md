# API & Infrastructure Management — Implementation Plan

## Purpose
DOLFish Control Center is being extended to manage project-wise API integrations and hosting configurations across the DOLFish ecosystem.

## Initial provider targets
- Vercel
- Netlify
- Railway
- Cloudflare
- Render

## Security model
- The dashboard database stores integration metadata, masked hints, status, environment scope, and secret references only.
- Raw API keys and access tokens must never be stored in browser state, local storage, GitHub, ordinary database columns, audit payloads, or chat.
- Provider credentials are entered into a server-side secret store or provider-managed secret interface.
- Owner authorization uses trusted `app_metadata.role`.
- Provider actions are server-side, allowlisted, scoped, and audited.
- Start with read-only identity/configuration checks. Mutations such as environment-variable changes and redeployments require explicit confirmation and provider-specific safeguards.

## Database
Migration `cc_api_integrations_registry` adds `public.cc_api_integrations` with project linkage, provider name, display name, secret reference, masked hint, environment scope, status, documentation URL, notes, creator and timestamps. RLS is enabled; owner/admin can read and only owner can write.

## Phased implementation
1. Project-wise API inventory and metadata registry (foundation schema deployed).
2. API Manager UI: select project, list integrations, add/edit metadata, environment scope, status and secret reference.
3. Secure credential input and server-side secret storage/reference resolution; never return secret values.
4. Provider authentication checks for the five hosting platforms.
5. Read configuration/environment variable inventory with values masked.
6. Carefully controlled add/update/delete environment variable actions, owner confirmation, audit logging.
7. Deploy/redeploy actions only after provider adapters and safety checks are verified.
8. Mobile/desktop smoke tests, authorization tests and secret-leak tests.

## Current boundary
The registry schema is deployed. UI, secret-storage workflow, provider account integrations, environment-variable operations and deployment actions are not yet implemented or verified.
