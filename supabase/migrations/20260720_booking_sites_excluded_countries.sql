-- ── booking_sites: per-site country exclusions ──────────────────────
-- A site tagged with a broad regions[] (e.g. 'Europe') shows up for every
-- country in that region via the region-fallback match, even ones it
-- doesn't actually serve (e.g. a Balkan bus site not covering Kosovo).
-- Lets an admin mark specific countries as NOT covered without having to
-- convert the whole record to an exhaustive countries[] allowlist.

alter table public.booking_sites
  add column if not exists excluded_countries text[] not null default '{}';
