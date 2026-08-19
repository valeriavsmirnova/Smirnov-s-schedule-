-- Store both sides of every event change so the UI can show "before -> after".
create or replace function private.audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  family uuid;
  event uuid;
  act text;
  details jsonb;
begin
  if tg_op = 'DELETE' then
    family := old.family_id;
    event := old.id;
    act := 'deleted';
    details := jsonb_build_object('before', to_jsonb(old) - 'family_id');
  elsif tg_op = 'INSERT' then
    family := new.family_id;
    event := new.id;
    act := 'created';
    details := jsonb_build_object('after', to_jsonb(new) - 'family_id');
  else
    new.updated_at := now();
    family := new.family_id;
    event := new.id;
    act := 'updated';
    details := jsonb_build_object(
      'before', to_jsonb(old) - 'family_id',
      'after', to_jsonb(new) - 'family_id'
    );
  end if;

  insert into public.audit_log(family_id, event_id, actor_id, action, snapshot)
  values (family, event, (select auth.uid()), act, details);

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.audit_event() from public;
