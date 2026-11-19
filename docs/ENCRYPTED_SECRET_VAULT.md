# Encrypted Secret Vault (prototype)

## Status
The database table and Supabase Edge Function `cc-secret-vault` are deployed. The function is JWT-protected and checks trusted `app_metadata.role === "owner"`. The master key is **not configured**, so vault writes are expected to fail until it is set.

## Design
- Secrets are accepted only by the HTTPS Edge Function.
- AES-256-GCM encryption is performed server-side with a random 96-bit IV.
- Only ciphertext and IV are stored in `public.cc_secret_vault`.
- The encryption key is derived from `CC_VAULT_MASTER_KEY` using SHA-256; it must be configured as a Supabase Edge Function secret and never placed in the frontend, database, repository, or chat.
- List returns metadata only. The function has no plaintext retrieval action.
- Direct authenticated database access to the vault table is revoked; owner metadata reads are allowed by RLS. Direct writes are denied.

## Important limitations / next hardening
1. Configure `CC_VAULT_MASTER_KEY` with a random value of at least 32 characters using Supabase's secure secrets interface. Do not paste it into ChatGPT.
2. Add audit events for vault create/update/delete.
3. Add UI for owner-only secret entry and metadata listing; the value field must clear immediately after successful save and never persist in browser storage.
4. Implement provider-specific credential validation without returning secret values.
5. Plan key rotation and backup/recovery before production use.
6. Review CORS origin restrictions, rate limits, and security testing before production.

This is an experimental vault foundation, not a production-approved secret manager.