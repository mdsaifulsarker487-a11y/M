-- Encrypted secret vault: ciphertext only. No plaintext secret storage.
create table if not exists public.cc_secret_vault (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.cc_projects(id) on delete cascade,
  provider text not null,
  integration_name text not null,
  environment_scope text not null default 'production',
  secret_name text not null,
  ciphertext text not null,
  iv text not null,
  masked_hint text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, provider, integration_name, environment_scope, secret_name)
);
alter table public.cc_secret_vault enable row level security;
revoke all on public.cc_secret_vault from anon, authenticated;
create policy "owner only vault metadata access" on public.cc_secret_vault
for select to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'owner');
create policy "no direct vault writes" on public.cc_secret_vault
for all to authenticated
using (false) with check (false);