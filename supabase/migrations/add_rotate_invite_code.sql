-- Выполните этот файл один раз в Supabase SQL Editor.
create or replace function public.rotate_family_invite_code(target_family_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Требуется вход';
  end if;

  if not exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
      and role = 'owner'
  ) then
    raise exception 'Сменить код может только владелец семьи';
  end if;

  loop
    new_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    begin
      update public.families set invite_code = new_code where id = target_family_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return new_code;
end;
$$;

revoke all on function public.rotate_family_invite_code(uuid) from public, anon;
grant execute on function public.rotate_family_invite_code(uuid) to authenticated;
