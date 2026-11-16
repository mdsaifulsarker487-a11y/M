create table if not exists public.cc_provider_health_checks (
 id uuid primary key default gen_random_uuid(),
 provider text not null references public.cc_provider_catalog(provider) on update cascade on delete restrict,
 checked_by uuid references auth.users(id) on delete set null,
 status text not null check (status in ('healthy','unhealthy','not_configured','error')),
 http_status integer,
 latency_ms integer,
 message text not null,
 checked_at timestamptz not null default now()
);
create index if not exists cc_provider_health_checks_provider_time_idx on public.cc_provider_health_checks(provider,checked_at desc);
alter table public.cc_provider_health_checks enable row level security;
drop policy if exists "cc_provider_health_checks_read_privileged" on public.cc_provider_health_checks;
create policy "cc_provider_health_checks_read_privileged" on public.cc_provider_health_checks for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
revoke insert, update, delete on public.cc_provider_health_checks from anon, authenticated;
grant select on public.cc_provider_health_checks to authenticated;
