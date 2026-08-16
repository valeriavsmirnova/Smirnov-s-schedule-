-- Выполните этот файл один раз в Supabase SQL Editor.
-- Старый статус parents безопасно преобразуется в both.
alter table public.events drop constraint if exists events_care_by_check;
update public.events set care_by = 'both' where care_by = 'parents';
alter table public.events add constraint events_care_by_check
  check (care_by in ('none','mother','father','both','grandparents','independent','other'));
