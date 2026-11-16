create or replace function public.cc_review_operation_request(
  p_request_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.cc_operation_requests%rowtype;
  v_updated public.cc_operation_requests%rowtype;
begin
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_reviewer_id is null then
    raise exception 'reviewer_required' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'review_note_too_long' using errcode = '22023';
  end if;

  select * into v_request
  from public.cc_operation_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'request_already_reviewed' using errcode = '40001';
  end if;

  update public.cc_operation_requests
  set status = p_decision,
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      review_note = nullif(btrim(p_note), '')
  where id = p_request_id
  returning * into v_updated;

  insert into public.cc_audit_events(actor_user_id,action,target_type,target_id,details)
  values (
    p_reviewer_id,
    'operation_request_' || p_decision,
    'operation_request',
    p_request_id::text,
    jsonb_build_object(
      'operation_type',v_request.operation_type,
      'target_project',v_request.target_project,
      'review_note',nullif(btrim(p_note),'')
    )
  );

  return jsonb_build_object(
    'id',v_updated.id,
    'status',v_updated.status,
    'reviewed_at',v_updated.reviewed_at,
    'review_note',v_updated.review_note
  );
end;
$$;
revoke all on function public.cc_review_operation_request(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.cc_review_operation_request(uuid,text,uuid,text) to service_role;
