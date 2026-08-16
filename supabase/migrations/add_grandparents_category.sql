-- Выполните этот файл один раз в Supabase SQL Editor.
alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check
  check (category in ('children','parents','school','health','grandparents','family'));
