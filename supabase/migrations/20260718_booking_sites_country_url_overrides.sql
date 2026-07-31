-- ── booking_sites: per-country URL overrides ────────────────────────
-- Some operators use a genuinely different URL per country rather than
-- one templated search URL (e.g. directferries.com/uruguay.htm vs
-- directferries.com/fiji.htm) -- a single url_template can't represent
-- that. Add a small override map so a merged/duplicate-cleanup record
-- can keep each country's real URL instead of discarding all but one.
-- Falls back to url_template when no override exists for the leg's country.

alter table public.booking_sites
  add column if not exists country_url_overrides jsonb not null default '{}'::jsonb;
