-- Выполните этот файл один раз в Supabase SQL Editor.
alter table public.events
  add column if not exists care_by text not null default 'none';

alter table public.events drop constraint if exists events_care_by_check;
alter table public.events add constraint events_care_by_check
  check (care_by in ('none','mother','father','both','grandparents','independent','other'));
