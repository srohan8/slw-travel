-- SLW Travel · Full DB reset
-- Run in: Supabase Dashboard → SQL Editor → New query
-- This wipes ALL data including auth users. Irreversible.

-- 1. Clear app data
truncate table public.contributions restart identity cascade;
truncate table public.trips        restart identity cascade;
truncate table public.profiles     restart identity cascade;

-- 2. Delete all auth users (cascades to profiles via FK)
delete from auth.users;

-- 3. Confirm
select
  (select count(*) from public.trips)         as trips,
  (select count(*) from public.contributions) as contributions,
  (select count(*) from public.profiles)      as profiles,
  (select count(*) from auth.users)           as auth_users;
