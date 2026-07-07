-- ── Public "anyone with the link" trip reads ──────────────────────────
-- The Publish flow lets an owner set trip.data->>'visibility' to
-- 'anyone', but no RLS policy previously granted read access to a
-- non-owner, non-collaborator caller (anon or any other authenticated
-- user). This is additive: Postgres OR's select policies together, so
-- it only loosens access for rows explicitly marked 'anyone' — private
-- and friends-only trips are unaffected.

create policy "anyone can read public journals"
  on trips for select
  using (data->>'visibility' = 'anyone');
