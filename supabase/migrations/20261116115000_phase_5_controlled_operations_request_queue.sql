create table if not exists public.cc_operation_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  operation_type text not null check (operation_type in ('deploy','restart','rollback','rotate_secret','provider_change','other')),
  target_project text not null check (char_length(target_project) between 2 and 120),
  rationale text not null check (char_length(rationale) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','failed','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cc_operation_requests_review_state_check check (
    (status in ('pending','cancelled') and reviewed_by is null and reviewed_at is null)
    or (status in ('approved','rejected','executed','failed') and reviewed_by is not null and reviewed_at is not null)
  )
);
create index if not exists cc_operation_requests_status_created_idx on public.cc_operation_requests(status,created_at desc);
create index if not exists cc_operation_requests_requested_by_created_idx on public.cc_operation_requests(requested_by,created_at desc);
create index if not exists cc_operation_requests_reviewed_by_idx on public.cc_operation_requests(reviewed_by);
alter table public.cc_operation_requests enable row level security;
drop policy if exists "cc_operation_requests_read_privileged" on public.cc_operation_requests;
create policy "cc_operation_requests_read_privileged" on public.cc_operation_requests for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') in ('owner','admin'));
drop policy if exists "cc_operation_requests_insert_privileged" on public.cc_operation_requests;
create policy "cc_operation_requests_insert_privileged" on public.cc_operation_requests for insert to authenticated with check (
  (select auth.jwt()->'app_metadata'->>'role') in ('owner','admin')
  and requested_by = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);
revoke update, delete on public.cc_operation_requests from anon, authenticated;
grant select, insert on public.cc_operation_requests to authenticated;
create or replace function public.cc_operation_requests_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists cc_operation_requests_updated_at on public.cc_operation_requests;
create trigger cc_operation_requests_updated_at before update on public.cc_operation_requests
for each row execute function public.cc_operation_requests_set_updated_at();
