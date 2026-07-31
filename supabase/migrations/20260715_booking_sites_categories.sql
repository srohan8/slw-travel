-- ── Multi-category booking sites ────────────────────────────────────
-- Some sites (e.g. an operator that sells both bus and train tickets)
-- legitimately belong to more than one category. `category` (singular)
-- stays as-is for backward compat with existing read paths and the
-- 20260714_booking_sites.sql seed data; `categories` (plural) is the new
-- source of truth going forward, backfilled from `category` below.

alter table public.booking_sites
  add column if not exists categories text[] not null default '{}';

update public.booking_sites
  set categories = array[category]
  where categories = '{}';

comment on column public.booking_sites.category is
  'Deprecated — use categories[] instead. Kept for backward compat; new rows should still populate it as categories[0].';
