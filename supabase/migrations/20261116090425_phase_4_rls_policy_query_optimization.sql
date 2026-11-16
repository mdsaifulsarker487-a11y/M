drop policy if exists cc_provider_catalog_select_privileged on public.cc_provider_catalog;
create policy cc_provider_catalog_select_privileged
  on public.cc_provider_catalog
  for select to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') in ('owner','admin'));

drop policy if exists cc_provider_health_checks_read_privileged on public.cc_provider_health_checks;
create policy cc_provider_health_checks_read_privileged
  on public.cc_provider_health_checks
  for select to authenticated
  using (((select auth.jwt())->'app_metadata'->>'role') in ('owner','admin'));
