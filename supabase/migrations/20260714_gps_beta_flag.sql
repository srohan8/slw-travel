-- ── GPS beta gating ──────────────────────────────────────────────────
-- Live GPS background tracking (docs/gps-recording-feature.md) is
-- functional but still device-unverified in several permission-flow edge
-- cases. Rather than a general tier/pricing system, add a single
-- admin-togglable boolean -- mirroring the existing profiles.is_admin
-- pattern exactly -- so access can be controlled while it hardens in
-- production. Manual tracking stays available to everyone regardless.

alter table public.profiles add column if not exists gps_beta boolean not null default false;

-- Additive alongside the existing self-update policy ("auth.uid() = id")
-- -- Postgres RLS policies for the same command are OR'd together, so a
-- user can still update their own profile via that policy; this only adds
-- a second path for admins to update *any* profile (needed to flip
-- gps_beta for someone else).
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
