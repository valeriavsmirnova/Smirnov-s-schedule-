-- Выполните этот файл один раз в Supabase SQL Editor.
alter table public.events
  add column if not exists all_day boolean not null default false;
