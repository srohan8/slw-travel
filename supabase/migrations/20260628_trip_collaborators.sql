-- ── trip_collaborators ────────────────────────────────────────────
-- Stores per-trip invites: who invited whom, at what role (edit/view).
-- Invitee matched by email so the invite works before they sign up.

create table if not exists trip_collaborators (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips(id) on delete cascade,
  invited_by    uuid not null references auth.users(id),
  invitee_email text not null,
  role          text not null default 'view' check (role in ('edit', 'view')),
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  unique(trip_id, invitee_email)
);

alter table trip_collaborators enable row level security;

-- Trip owner: full CRUD on their trip's collaborators
create policy "owner manages collaborators"
  on trip_collaborators for all
  using (
    exists (
      select 1 from trips
      where trips.id = trip_collaborators.trip_id
        and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from trips
      where trips.id = trip_collaborators.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- Invitee: can read their own invites (by email)
create policy "invitee reads own invites"
  on trip_collaborators for select
  using (invitee_email = auth.email());

-- ── Update trips RLS ──────────────────────────────────────────────
-- Allow collaborators to read trips they were invited to.
-- Replace the existing select policy with one that covers collaborators.

drop policy if exists "Users can view their own trips" on trips;
drop policy if exists "user reads own trips" on trips;

create policy "owner or collaborator reads trip"
  on trips for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from trip_collaborators tc
      where tc.trip_id = trips.id
        and tc.invitee_email = auth.email()
    )
  );

-- Allow collaborators with 'edit' role to update trips.
drop policy if exists "Users can update their own trips" on trips;
drop policy if exists "user updates own trips" on trips;

create policy "owner or edit-collaborator updates trip"
  on trips for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from trip_collaborators tc
      where tc.trip_id = trips.id
        and tc.invitee_email = auth.email()
        and tc.role = 'edit'
    )
  );
