# Render read-only integration

## Render account
Connected Render workspace discovered: **My Workspace** (`tea-dbla6gjncjis73d8i4k0`). The workspace must be explicitly selected before inspecting workspace resources through the Render connector.

## Function
`cc-render-readonly` (Supabase Edge Function v1, ACTIVE, JWT verification enabled).

## Scope
- List services (`GET /v1/services`)
- List recent deploys for a validated service ID (`GET /v1/services/{serviceId}/deploys`)
- Owner-only; exact-origin CORS; encrypted vault token decrypted server-side.
- No deploy, environment variable, service mutation, or deletion operations.

## Credential
Store in the Control Center encrypted vault:
- Provider: `render`
- Secret name: `RENDER_API_KEY`
- Use a Render API key with read access sufficient to list services and deploys. Do not share it in chat.

## Required configuration
Requires `CC_VAULT_MASTER_KEY`, exact `CC_CONTROL_CENTER_ORIGIN`, Supabase owner `app_metadata.role=owner`, and a valid Render API key in the vault.

## Verification
Render connector confirmed workspace name and ID. Live Control Center API reads are pending the encrypted vault token. Service inventory was not queried because Render requires the user to select a workspace explicitly before resource access.
