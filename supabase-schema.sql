-- SLW Travel · Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query

-- ── Trips ────────────────────────────────────────────────────────────
create table if not exists public.trips (
  id          text        primary key,          -- 'trip-<timestamp>' from client
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null default '',
  data        jsonb       not null default '{}', -- full trip blob (stops, legs, notes, budget, currency)
  updated_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists trips_user_id_idx on public.trips(user_id);

-- Row Level Security: each user can only see/edit their own trips
alter table public.trips enable row level security;

drop policy if exists "Users can read own trips"   on public.trips;
drop policy if exists "Users can insert own trips"  on public.trips;
drop policy if exists "Users can update own trips"  on public.trips;
drop policy if exists "Users can delete own trips"  on public.trips;

create policy "Users can read own trips"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "Users can insert own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trips"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "Users can delete own trips"
  on public.trips for delete
  using (auth.uid() = user_id);


-- ── Community contributions ──────────────────────────────────────────
create table if not exists public.contributions (
  id          uuid        primary key default gen_random_uuid(),
  leg_key     text        not null,   -- e.g. "istanbul-ankara-train"
  user_id     uuid        references auth.users(id) on delete set null,
  kind        text        not null,   -- price | schedule | border | tip | confirmed | warning
  text        text        not null,
  source      text        default '',
  votes       int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists contrib_leg_key_idx on public.contributions(leg_key);

alter table public.contributions enable row level security;

drop policy if exists "Anyone can read contributions"               on public.contributions;
drop policy if exists "Authenticated users can insert contributions" on public.contributions;
drop policy if exists "Users can update own contributions"           on public.contributions;

create policy "Anyone can read contributions"
  on public.contributions for select
  using (true);

create policy "Authenticated users can insert contributions"
  on public.contributions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contributions"
  on public.contributions for update
  using (auth.uid() = user_id);


-- ── Profiles (auto-created on sign-up via trigger) ───────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text       default '',
  avatar_url  text        default '',
  location    text        default '',
  karma       int         not null default 0,
  created_at  timestamptz not null default now()
);

-- Add location column if upgrading from older schema
alter table public.profiles add column if not exists location text default '';

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read profiles"      on public.profiles;
drop policy if exists "Users can update own profile"  on public.profiles;

create policy "Anyone can read profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: create a profile row whenever a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Voting & Confirmation tables ─────────────────────────────────────

-- Add confirmed_count to contributions (idempotent)
alter table public.contributions add column if not exists confirmed_count int not null default 0;

-- contribution_votes: tracks who voted on which contribution (prevents double-voting)
create table if not exists public.contribution_votes (
  contribution_id uuid references public.contributions(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  primary key (contribution_id, user_id)
);

alter table public.contribution_votes enable row level security;

drop policy if exists "Anyone can read contribution_votes"                on public.contribution_votes;
drop policy if exists "Authenticated users can insert own vote"           on public.contribution_votes;
drop policy if exists "Users can delete own vote"                         on public.contribution_votes;

create policy "Anyone can read contribution_votes"
  on public.contribution_votes for select
  using (true);

create policy "Authenticated users can insert own vote"
  on public.contribution_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own vote"
  on public.contribution_votes for delete
  using (auth.uid() = user_id);


-- contribution_confirms: tracks who confirmed a contribution note
create table if not exists public.contribution_confirms (
  contribution_id uuid references public.contributions(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  primary key (contribution_id, user_id)
);

alter table public.contribution_confirms enable row level security;

drop policy if exists "Anyone can read contribution_confirms"             on public.contribution_confirms;
drop policy if exists "Authenticated users can insert own confirm"        on public.contribution_confirms;
drop policy if exists "Users can delete own confirm"                      on public.contribution_confirms;

create policy "Anyone can read contribution_confirms"
  on public.contribution_confirms for select
  using (true);

create policy "Authenticated users can insert own confirm"
  on public.contribution_confirms for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own confirm"
  on public.contribution_confirms for delete
  using (auth.uid() = user_id);


-- ── Karma trigger functions ───────────────────────────────────────────

-- +15 karma when a user posts a new contribution
create or replace function public.handle_new_contribution()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is not null then
    update public.profiles
    set karma = karma + 15
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_contribution on public.contributions;
create trigger on_new_contribution
  after insert on public.contributions
  for each row execute procedure public.handle_new_contribution();


-- +2 karma to the contribution author when someone votes on their contribution
create or replace function public.handle_new_vote()
returns trigger language plpgsql security definer as $$
declare
  v_author_id uuid;
begin
  select user_id into v_author_id
  from public.contributions
  where id = new.contribution_id;

  if v_author_id is not null then
    update public.profiles
    set karma = karma + 2
    where id = v_author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_contribution_vote on public.contribution_votes;
create trigger on_new_contribution_vote
  after insert on public.contribution_votes
  for each row execute procedure public.handle_new_vote();


-- +25 karma to the contribution author when someone confirms their contribution
create or replace function public.handle_new_confirm()
returns trigger language plpgsql security definer as $$
declare
  v_author_id uuid;
begin
  select user_id into v_author_id
  from public.contributions
  where id = new.contribution_id;

  if v_author_id is not null then
    update public.profiles
    set karma = karma + 25
    where id = v_author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_contribution_confirm on public.contribution_confirms;
create trigger on_new_contribution_confirm
  after insert on public.contribution_confirms
  for each row execute procedure public.handle_new_confirm();


-- ── Helper RPC: atomically increment confirmed_count ─────────────────
create or replace function public.increment_confirmed(contrib_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.contributions
  set confirmed_count = confirmed_count + 1
  where id = contrib_id;
end;
$$;
