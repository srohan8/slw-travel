-- ── Admin > Users tab: manual plan field + per-user AI usage ────────
-- There's no real subscription/billing system yet (checkAndGate() in
-- app/index.html always returns true) — `plan` is just a label admins can
-- set manually from the Users tab, not something enforced anywhere yet.
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free','pro'));

-- The existing "Users can update own profile" policy is auth.uid() = id
-- only, so it doesn't cover an admin editing someone else's plan. This
-- subquery is safe from the circular-RLS issue fixed in
-- 20260629_fix_rls_circular.sql: it only ever hits profiles' own SELECT
-- policy ("Anyone can read profiles", using(true)), never re-enters this
-- UPDATE policy, so it can't recurse.
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ));

-- api_usage_log had no way to attribute a call to the user who made it.
-- Nullable: existing rows and any future guest-triggered calls have no
-- user to attribute to. Populated by the proxy going forward (see
-- proxy/server.js logUsageToSupabase).
alter table public.api_usage_log add column if not exists user_id uuid references auth.users(id) on delete set null;
