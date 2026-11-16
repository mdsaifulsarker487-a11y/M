create table if not exists public.cc_provider_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  display_name text not null,
  category text not null check (category in ('source_control','hosting','database','network_security','storage','secret_management','observability')),
  auth_method text not null,
  minimum_scopes text[] not null default '{}',
  capabilities text[] not null default '{}',
  docs_url text,
  connection_strategy text not null default 'manual_oauth',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cc_provider_catalog enable row level security;
drop policy if exists "cc_provider_catalog_select_privileged" on public.cc_provider_catalog;
create policy "cc_provider_catalog_select_privileged" on public.cc_provider_catalog for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
drop policy if exists "cc_provider_catalog_owner_manage" on public.cc_provider_catalog;
create policy "cc_provider_catalog_owner_manage" on public.cc_provider_catalog for all to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'owner') with check ((auth.jwt()->'app_metadata'->>'role') = 'owner');
create index if not exists cc_provider_catalog_category_idx on public.cc_provider_catalog(category);
insert into public.cc_provider_catalog (provider,display_name,category,auth_method,minimum_scopes,capabilities,docs_url,connection_strategy) values
('github','GitHub','source_control','GitHub App installation or fine-grained token',array['Metadata: read-only','Contents: read-only (initial phase)'],array['Repository inventory','Branch and commit metadata','Workflow status (read-only)'],'https://docs.github.com/en/apps/creating-github-apps','oauth_or_app_install'),
('gitlab','GitLab','source_control','OAuth 2.0 or project access token',array['read_api'],array['Project inventory','Pipeline status','Merge request metadata'],'https://docs.gitlab.com/ee/api/','oauth'),
('vercel','Vercel','hosting','OAuth 2.0 integration token',array['Read-only team/project access'],array['Project inventory','Deployment status','Build metadata'],'https://vercel.com/docs/rest-api','oauth'),
('render','Render','hosting','API key',array['Read-only workspace/service access'],array['Service inventory','Deploy status','Runtime metadata'],'https://render.com/docs/api','api_key'),
('railway','Railway','hosting','Project-scoped API token',array['Read-only project access'],array['Project and service inventory','Deployment metadata'],'https://docs.railway.com/reference/public-api','api_token'),
('netlify','Netlify','hosting','OAuth 2.0 or personal access token',array['Read-only site access'],array['Site inventory','Deploy status'],'https://docs.netlify.com/api-and-cli-guides/api-guides/','oauth_or_token'),
('cloudflare','Cloudflare','network_security','API token',array['Zone:Read','DNS:Read (only when required)'],array['Zone inventory','DNS metadata','Security configuration status'],'https://developers.cloudflare.com/fundamentals/api/','scoped_api_token'),
('supabase','Supabase','database','Management API access token',array['Read-only project metadata'],array['Project inventory','Project health metadata'],'https://supabase.com/docs/reference/api/introduction','oauth_or_token'),
('cloudinary','Cloudinary','storage','API key/secret via server-side credential',array['Read-only asset metadata where supported'],array['Cloud asset inventory','Usage metadata'],'https://cloudinary.com/documentation/admin_api','server_secret'),
('google-cloud-secret-manager','Google Cloud Secret Manager','secret_management','Service account / workload identity',array['Secret Manager Viewer for inventory; accessor only for named secrets'],array['Secret metadata','Secret version status'],'https://cloud.google.com/secret-manager/docs','workload_identity')
on conflict (provider) do update set display_name=excluded.display_name,category=excluded.category,auth_method=excluded.auth_method,minimum_scopes=excluded.minimum_scopes,capabilities=excluded.capabilities,docs_url=excluded.docs_url,connection_strategy=excluded.connection_strategy,updated_at=now();
