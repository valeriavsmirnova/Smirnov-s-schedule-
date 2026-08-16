# Семейный календарь

Небольшой общий календарь на React + Supabase. Участники входят по magic link, создают семью или присоединяются по коду, вместе меняют события и видят неизменяемый журнал добавлений, правок и удалений.

## Запуск

1. Создайте проект на [Supabase](https://supabase.com/dashboard).
2. В SQL Editor выполните `supabase/migrations/initial_schema.sql`.
3. В Authentication → URL Configuration укажите адрес сайта и для разработки `http://localhost:5173`.
4. Скопируйте `.env.example` в `.env`, вставьте Project URL и publishable key из Connect/API Keys.
5. Выполните `npm install`, затем `npm run dev`.

Для публикации соберите `npm run build` и разместите папку `dist` на Vercel, Netlify или Cloudflare Pages. Добавьте опубликованный адрес в Redirect URLs Supabase.

Важно: в браузере используется только publishable key. Secret/service-role key добавлять в `.env` нельзя.
