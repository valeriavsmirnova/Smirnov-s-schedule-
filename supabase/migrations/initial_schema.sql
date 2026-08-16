create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Участник' check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8)),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_id_idx on public.family_members(user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  color text not null default '#e76f51' check (color ~ '^#[0-9a-fA-F]{6}$'),
  category text not null default 'family' check (category in ('children','parents','school','health','grandparents','family')),
  all_day boolean not null default false,
  care_by text not null default 'none' check (care_by in ('none','mother','father','both','grandparents','independent','other')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_valid_time check (ends_at > starts_at)
);
create index events_family_starts_idx on public.events(family_id, starts_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  event_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('created','updated','deleted')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index audit_log_family_created_idx on public.audit_log(family_id, created_at desc);

create or replace function private.is_family_member(target_family uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.family_members where family_id=target_family and user_id=(select auth.uid())) $$;
revoke all on function private.is_family_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=''
as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1),'Участник')); return new; end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_family(family_name text) returns uuid language plpgsql security definer set search_path=''
as $$ declare new_id uuid; begin
  if (select auth.uid()) is null then raise exception 'Требуется вход'; end if;
  if family_name is null or char_length(trim(family_name)) not between 1 and 80 then raise exception 'Укажите название семьи'; end if;
  insert into public.families(name,created_by) values(trim(family_name),(select auth.uid())) returning id into new_id;
  insert into public.family_members(family_id,user_id,role) values(new_id,(select auth.uid()),'owner'); return new_id;
end $$;
revoke all on function public.create_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;

create or replace function public.join_family(invite_code text) returns uuid language plpgsql security definer set search_path=''
as $$ declare found_id uuid; begin
  if (select auth.uid()) is null then raise exception 'Требуется вход'; end if;
  select id into found_id from public.families where families.invite_code=upper(trim(join_family.invite_code));
  if found_id is null then raise exception 'Семья с таким кодом не найдена'; end if;
  insert into public.family_members(family_id,user_id) values(found_id,(select auth.uid())) on conflict do nothing; return found_id;
end $$;
revoke all on function public.join_family(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;

create or replace function public.rotate_family_invite_code(target_family_id uuid) returns text language plpgsql security definer set search_path=''
as $$ declare new_code text; begin
  if (select auth.uid()) is null then raise exception 'Требуется вход'; end if;
  if not exists (select 1 from public.family_members where family_id=target_family_id and user_id=(select auth.uid()) and role='owner') then raise exception 'Сменить код может только владелец семьи'; end if;
  loop
    new_code:=upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,8));
    begin update public.families set invite_code=new_code where id=target_family_id; exit; exception when unique_violation then null; end;
  end loop;
  return new_code;
end $$;
revoke all on function public.rotate_family_invite_code(uuid) from public, anon;
grant execute on function public.rotate_family_invite_code(uuid) to authenticated;

create or replace function private.audit_event() returns trigger language plpgsql security definer set search_path=''
as $$ declare row_data public.events; act text; begin
  if tg_op='DELETE' then row_data:=old; act:='deleted'; elsif tg_op='INSERT' then row_data:=new; act:='created'; else new.updated_at:=now(); row_data:=new; act:='updated'; end if;
  insert into public.audit_log(family_id,event_id,actor_id,action,snapshot) values(row_data.family_id,row_data.id,(select auth.uid()),act,to_jsonb(row_data)-'family_id');
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.audit_event() from public;
create trigger events_audit before insert or update or delete on public.events for each row execute function private.audit_event();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_read_members on public.profiles for select to authenticated using (id=(select auth.uid()) or exists(select 1 from public.family_members mine join public.family_members theirs using(family_id) where mine.user_id=(select auth.uid()) and theirs.user_id=profiles.id));
create policy profiles_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy families_read_members on public.families for select to authenticated using(private.is_family_member(id));
create policy members_read_family on public.family_members for select to authenticated using(private.is_family_member(family_id));
create policy events_read_family on public.events for select to authenticated using(private.is_family_member(family_id));
create policy events_insert_family on public.events for insert to authenticated with check(private.is_family_member(family_id) and created_by=(select auth.uid()));
create policy events_update_family on public.events for update to authenticated using(private.is_family_member(family_id)) with check(private.is_family_member(family_id));
create policy events_delete_family on public.events for delete to authenticated using(private.is_family_member(family_id));
create policy audit_read_family on public.audit_log for select to authenticated using(private.is_family_member(family_id));

grant select,update on public.profiles to authenticated;
grant select on public.families,public.family_members,public.audit_log to authenticated;
grant select,insert,update,delete on public.events to authenticated;
grant usage,select on sequence public.audit_log_id_seq to authenticated;

do $$ begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.audit_log; exception when duplicate_object then null; end $$;
