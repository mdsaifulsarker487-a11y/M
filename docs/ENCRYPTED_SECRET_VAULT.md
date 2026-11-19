# Encrypted Secret Vault (prototype)

## Deployed status
- Supabase table `public.cc_secret_vault` is deployed with RLS and direct writes denied.
- Edge Function `cc-secret-vault` is deployed, version 2, JWT verification enabled.
- Dashboard UI provides owner-only entry, metadata listing, and deletion. Secret values are never listed or returned.
- AES-GCM encryption runs server-side with a fresh 96-bit IV per write.
- Vault create/update/delete operations write metadata-only events to `cc_audit_events`.

## Required secure configuration (not yet complete)
Configure these in Supabase Dashboard → Edge Functions → Secrets. Never place them in the repository, frontend, ordinary database rows, or chat:
1. `CC_VAULT_MASTER_KEY`: a randomly generated value with at least 32 characters. Keep a secure offline recovery copy; loss makes existing ciphertext unrecoverable.
2. `CC_CONTROL_CENTER_ORIGIN`: the exact HTTPS origin serving the Control Center, with no trailing path (for example, `https://control.example.com`). The function rejects requests unless the request Origin matches this value.

Do not save real production credentials until both values are configured and the owner account is verified.

## Security controls
- JWT is verified by the Edge Function platform and the function separately checks trusted `app_metadata.role === "owner"`.
- CORS is exact-origin allowlisted; no wildcard origin.
- Secret values are encrypted using AES-GCM before database insertion.
- List returns metadata only. There is no plaintext retrieval action.
- Audit details contain provider/integration/variable metadata only, never secret values.
- Delete records metadata in audit history before returning success.
- Browser input is cleared after submission; values are not intentionally persisted in local storage.

## Remaining before production
- Configure the two Edge Function secrets and verify the owner identity/role.
- Perform owner and unauthorized-user tests, including CORS, set/list/delete and audit verification.
- Implement a reviewed key-rotation and recovery procedure before production.
- Add rate limiting and operational alerting.
- Provider adapters must decrypt only inside trusted server-side functions and must never return plaintext to the browser.
- This remains a prototype, not a production-approved secret manager.
