# Cloudflare read-only integration

## Verified account
Cloudflare account: `Mdsaifulsarker487@gmail.com's Account`
Account ID: `09dcb61da996a69d4a5d0834bcc73ea5`

## Scope
The `cc-cloudflare-readonly` Supabase Edge Function lists zones and Workers scripts only. It is owner-only, exact-origin restricted, reads the API token from the encrypted vault server-side, and never returns credentials. No DNS edits, Worker deployments, configuration changes, or deletes are exposed.

## Credential
Store an API token in the encrypted Control Center vault:
- Provider: `cloudflare`
- Secret name: `CLOUDFLARE_API_TOKEN`
- Permissions: Zone:Zone:Read (zones) and Account:Workers Scripts:Read (Workers scripts), scoped to the verified account and required zones.

## Actions
- `{ "action": "zones" }`
- `{ "action": "workers" }`

Requires valid Supabase JWT, `app_metadata.role = "owner"`, `CC_VAULT_MASTER_KEY`, and exact `CC_CONTROL_CENTER_ORIGIN`.

## Notes
Account identity was verified using the connected Cloudflare account. Live token-backed reads from the Control Center remain pending until the token is stored in the encrypted vault.