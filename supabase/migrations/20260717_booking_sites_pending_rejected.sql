-- ── booking_sites_pending: keep rejected rows instead of hard-deleting ──
-- Auto-triage and the manual review modal both used a hard DELETE on
-- reject, leaving zero audit trail once the browser tab that ran the pass
-- closed or refreshed -- for a bulk pass that can auto-reject dozens of
-- rows at once, that's a real gap (no way to double-check what got
-- rejected, or undo a wrong call). Soft-delete via a status flag instead;
-- the default pending-queue fetch filters these out, with a separate
-- "View rejected" toggle to see them.

alter table public.booking_sites_pending
  add column if not exists rejected boolean not null default false;

alter table public.booking_sites_pending
  add column if not exists rejected_reason text;
