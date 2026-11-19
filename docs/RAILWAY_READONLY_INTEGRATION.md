# Railway read-only integration

## Scope
The `cc-railway-readonly` Supabase Edge Function provides owner-only, read-only access to Railway projects, services/environments, and deployments. It does not create projects, change variables, deploy, restart, roll back, or delete resources.

## Credential
Store a Railway account API token in the encrypted Control Center vault:
- Provider: `railway`
- Secret name: `CC_RAILWAY_API_TOKEN`

Never put the token in frontend code, GitHub, logs, or chat. The function decrypts it server-side and never returns it.

## Actions
Invoke `cc-railway-readonly` with:
- `{ "action": "projects" }`
- `{ "action": "services", "project_id": "<Railway project UUID>" }`
- `{ "action": "deployments", "project_id": "<Railway project UUID>", "environment_id": "<environment UUID>" }`

Requires a valid Supabase JWT, `app_metadata.role = "owner"`, and exact configured `CC_CONTROL_CENTER_ORIGIN`.

## Setup
Configure `CC_VAULT_MASTER_KEY` and `CC_CONTROL_CENTER_ORIGIN` as Supabase Edge Function secrets. Add `CC_RAILWAY_API_TOKEN` through the encrypted vault UI. A Railway project must exist before project/service/deployment data can be populated.

## Limitations
The connected Railway account currently returned no projects, so live project/deployment reads are not verified. The function uses fixed Railway GraphQL v2 queries; API schema or token permission changes may require an update.