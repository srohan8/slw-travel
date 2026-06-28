-- ── Fix circular RLS between trips ↔ trip_collaborators ──────────────
-- The previous migration created a circular dependency:
--   trips SELECT policy → EXISTS on trip_collaborators
--   trip_collaborators ALL policy → EXISTS on trips
-- PostgreSQL can infinite-loop on this, returning empty results.
-- Fix: use SECURITY DEFINER functions that bypass RLS for the inner lookup.

-- Function: is the current user a collaborator on a given trip?
-- Reads trip_collaborators WITHOUT triggering its own RLS (security definer).
create or replace function is_trip_collaborator(trip_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from trip_collaborators
    where trip_id = trip_uuid
      and invitee_email = auth.email()
  )
$$;

-- Function: does the current user own a given trip?
-- Reads trips WITHOUT triggering its own RLS (security definer).
create or replace function is_trip_owner(trip_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from trips
    where id = trip_uuid
      and user_id = auth.uid()
  )
$$;

-- ── Update trips RLS ──────────────────────────────────────────────────
drop policy if exists "owner or collaborator reads trip" on trips;

create policy "owner or collaborator reads trip"
  on trips for select
  using (
    user_id = auth.uid()
    or is_trip_collaborator(id)
  );

-- ── Update trip_collaborators RLS ─────────────────────────────────────
-- Replace the policy that reads trips with one using the definer function.
drop policy if exists "owner manages collaborators" on trip_collaborators;

create policy "owner manages collaborators"
  on trip_collaborators for all
  using (is_trip_owner(trip_id))
  with check (is_trip_owner(trip_id));
