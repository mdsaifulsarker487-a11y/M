-- DOLFish Control Center: initial database schema
-- Apply only after selecting and activating the intended Supabase project.
-- Roles come from trusted app_metadata, never user-editable user_metadata.
create table if not exists public.cc_projects (
 id uuid primary key default gen_random_uuid(),
 name text not null, slug text not null unique, description text not null default '',
 lifecycle_status text not null default 'planned' check (lifecycle_status in ('planned','active','maintenance','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cc_provider_connections (
 id uuid primary key default gen_random_uuid(), provider text not null, display_name text not null,
 status text not null default 'not_connected' check (status in ('not_connected','pending','connected','error')),
 secret_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(provider, display_name)
);
create table if not exists public.cc_audit_events (
 id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id) on delete set null,
 action text not null, target_type text not null, target_id text, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.cc_projects enable row level security;
alter table public.cc_provider_connections enable row level security;
alter table public.cc_audit_events enable row level security;
create policy "cc admins read projects" on public.cc_projects for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
create policy "cc admins manage projects" on public.cc_projects for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'))
with check ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
create policy "cc admins read provider metadata" on public.cc_provider_connections for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
create policy "cc owners manage provider metadata" on public.cc_provider_connections for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') = 'owner')
with check ((select auth.jwt()->'app_metadata'->>'role') = 'owner');
create policy "cc admins read audit events" on public.cc_audit_events for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
revoke all on public.cc_audit_events from anon, authenticated;
grant select on public.cc_audit_events to authenticated;
grant select, insert, update, delete on public.cc_projects to authenticated;
grant select, insert, update, delete on public.cc_provider_connections to authenticated;
-- Audit inserts must come from a trusted server-side service.
-- secret_reference is a vault path/reference only, never a secret value.
