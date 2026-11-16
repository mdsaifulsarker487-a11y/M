-- Phase 4: monitoring query performance and provider catalog policy cleanup.
create index if not exists cc_provider_health_checks_checked_by_idx
  on public.cc_provider_health_checks(checked_by);

drop policy if exists cc_provider_catalog_owner_manage on public.cc_provider_catalog;

create policy cc_provider_catalog_owner_insert
  on public.cc_provider_catalog
  for insert to authenticated
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'owner');

create policy cc_provider_catalog_owner_update
  on public.cc_provider_catalog
  for update to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'owner')
  with check (((select auth.jwt())->'app_metadata'->>'role') = 'owner');

create policy cc_provider_catalog_owner_delete
  on public.cc_provider_catalog
  for delete to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') = 'owner');
