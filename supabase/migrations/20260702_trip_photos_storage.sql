-- ── trip-photos storage bucket ──────────────────────────────────────
-- Cover images and per-stop journal photos used to be embedded as base64
-- text directly inside trips.data. That meant every sync of a trip
-- re-transferred every one of its photos in full, even completely
-- unchanged ones — the main driver of Supabase egress far past quota.
-- Storage objects are fetched by URL only when actually displayed, and
-- the browser's own HTTP cache means an unchanged photo is never
-- re-downloaded again after the first view.
--
-- Public bucket with unguessable (random-uuid) object paths, rather than
-- matching trips' strict owner-only RLS: the app's "Publish journal —
-- anyone with the link" sharing option needs photos to be viewable by
-- visitors who aren't signed in at all, and a private bucket would need
-- per-view signed URLs to support that. Note: as of this migration, the
-- trips table's own RLS (see supabase-schema.sql) is owner-only with no
-- public carve-out for published rows, so that sharing option doesn't
-- yet actually work end-to-end for a third-party viewer — a separate,
-- pre-existing gap this migration doesn't fix.
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

-- Object paths are {user_id}/{trip_id}/{random}.ext — the first path
-- segment must match the uploader's own auth.uid() for all writes.
drop policy if exists "Owners can upload their own trip photos" on storage.objects;
create policy "Owners can upload their own trip photos"
  on storage.objects for insert
  with check (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners can update their own trip photos" on storage.objects;
create policy "Owners can update their own trip photos"
  on storage.objects for update
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners can delete their own trip photos" on storage.objects;
create policy "Owners can delete their own trip photos"
  on storage.objects for delete
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can view trip photos" on storage.objects;
create policy "Anyone can view trip photos"
  on storage.objects for select
  using (bucket_id = 'trip-photos');
