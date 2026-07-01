-- ── route_cache ───────────────────────────────────────────────────
-- Shared, cross-user cache of AI route-planning results, keyed the same
-- way as the client's local cache (see buildCacheKey() in app/index.html).
-- Goal: once one signed-in user searches a route, every other visitor
-- who searches (or clicks a Popular corridor for) the same route/pace/
-- modes combo gets it instantly instead of triggering a fresh AI call.
--
-- Reads are open to everyone (including guests) — it's just route
-- suggestions, safe to show anyone. Writes are restricted to signed-in
-- users only, to cut down on anonymous cache-poisoning: app/index.html
-- renders cached fields via innerHTML with no HTML-escaping anywhere,
-- so an open-write shared table would be a stored-XSS vector hitting
-- every visitor who views that corridor, not just the writer's own
-- browser. Gating writes to authenticated accounts doesn't eliminate
-- that risk, but it matches how every other write-path in this app
-- (contributions, trips) is already gated.

create table if not exists public.route_cache (
  cache_key   text        primary key,
  from_city   text        not null,
  to_city     text        not null,
  result      jsonb       not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table public.route_cache enable row level security;

drop policy if exists "Anyone can read route_cache" on public.route_cache;
create policy "Anyone can read route_cache"
  on public.route_cache for select
  using (true);

drop policy if exists "Authenticated users can insert route_cache" on public.route_cache;
create policy "Authenticated users can insert route_cache"
  on public.route_cache for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update route_cache" on public.route_cache;
create policy "Authenticated users can update route_cache"
  on public.route_cache for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
