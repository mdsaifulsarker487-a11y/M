# DOLFish Control Center

A bilingual (English/Bangla) internal operations dashboard foundation for the DOLFish ecosystem.

## Current foundation
- Overview dashboard and project registry
- API & Secrets inventory screen (metadata only; no secret values)
- Infrastructure provider directory
- Monitoring, Security & Audit, Operations, and Documentation sections
- Responsive dark futuristic UI
- English/Bangla language toggle

## Important security boundary
This first version is a frontend foundation only. It does not authenticate users, connect to provider accounts, manage live secrets, deploy services, or perform production actions. Provider cards and project records are sample/demo data. Never paste API keys or credentials into index.html or commit them to this repository.

## Planned implementation sequence
1. Add secure authentication and role-based access.
2. Add a backend API and audit logging.
3. Integrate a dedicated secret manager (Google Cloud Secret Manager or equivalent); store metadata, not raw secret values, in the application database.
4. Add scoped integrations for GitHub, Vercel, Render, Supabase, Cloudflare and other providers.
5. Add monitoring, approval workflows, secret rotation and safe operations.
6. Add tests, deployment configuration and production hardening.

## Preview
Open index.html in a browser, or enable GitHub Pages for this repository when ready.
