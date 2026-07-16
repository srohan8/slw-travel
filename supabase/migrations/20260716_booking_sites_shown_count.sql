-- ── Booking sites: cross-user "shown" counter ───────────────────────
-- trackAffShown() (app/index.html) already records affiliate-link
-- impressions to localStorage via _readAffStats/_writeAffStats, but that's
-- browser-local only — not a real signal across users. This adds a
-- Supabase-backed shown_count on booking_sites so the admin site table can
-- sort/filter by actual aggregate usage.

alter table public.booking_sites
  add column if not exists shown_count integer not null default 0;

-- Atomic increment via RPC — a plain client-side
-- `.update({shown_count: shown_count + 1})` would need a read-then-write
-- round trip and race under concurrent writes. security definer so it can
-- run from a regular (non-admin) traveler's session, mirroring
-- public.increment_confirmed in supabase-schema.sql — this function only
-- ever increments a counter, no other side effects, so it's safe to expose
-- to anon/authenticated callers the same way.
create or replace function public.increment_site_shown_count(site_id text)
returns void language plpgsql security definer as $$
begin
  update public.booking_sites
  set shown_count = shown_count + 1
  where id = site_id;
end;
$$;
