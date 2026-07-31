# Route Leg Verification (Brave-grounded) — Feature Doc
**bysloth / slw.travel · v1.0 · 2026-07-14**

---

## 1. Overview

`planRoute()` generates a suggested overland route via an LLM call
(`callAI()` → proxy `/api/ai` → Claude, with a DeepSeek failsafe). Each
leg's `confidence` (`verified` / `check` / `uncertain`) is set entirely by
the model's own training-data recall — there is no web grounding at all.
That's the honest reason the app shows confidence badges in the first
place: the model can be wrong about whether a border is currently open,
whether a ferry still runs, or what something actually costs.

This feature adds a background, targeted second opinion: for legs the
model itself already flagged as `check`/`uncertain`, ask a real-time,
cited search API (Brave's Answers API) whether it can confirm or correct
the leg. If it finds something meaningfully different, the leg's card
patches in place with a brief pulse. If Brave has nothing better, nothing
visibly changes — silence is the expected, common outcome.

**Not built**: grounding for every leg, or re-verification on a schedule.
This only ever touches legs the model already told you it's unsure about,
once, right after a route is generated.

---

## 2. Why not verify every leg?

A `verified` leg already represents high model confidence on something
well-established (e.g. "Istanbul → Ankara bus" — a corridor with dense,
stable training data). Grounding it anyway would burn API calls for no
real accuracy gain, and risks *introducing* noise if a mediocre search
result contradicts a genuinely solid answer. Targeting only already-shaky
legs concentrates the (cheap, but non-zero) verification budget exactly
where the failure risk actually is.

---

## 3. Trigger

`verifyUncertainLegs(d)` runs, fire-and-forget, immediately after each of
`planRoute()`'s render call sites (`app/index.html`):
- The cache-hit path (local or shared route cache)
- The fresh-AI-response path
- `_restorePendingRoute()` (a route restored after an auth-redirect
  interruption)

It does **not** run on settings-driven re-renders of an already-shown
route (e.g. toggling affiliate links) — verification is a "once per route
generation" concern, and `leg._verified` (set the moment a leg is queued)
guards against accidental re-queueing even if it were called again.

---

## 4. Sequencing & rate limits

Brave's Answers API caps at **2 requests/second**. `verifyUncertainLegs()`
processes flagged legs through a simple sequential queue with a ~600ms
gap between calls (≈1.67 req/s) — no queue library, no backoff strategy,
just a fixed delay. A single route rarely has more than a handful of
uncertain legs, so this is deliberately unsophisticated.

---

## 5. Caching — `_verifyCache` / `VERIFY_CACHE_KEY`

Mirrors `_geoCache`'s shape (localStorage-hydrated, `{result, ts}`
entries), but with a much shorter TTL: **6 hours**, not `_geoCache`'s
30-day success / 24h failure — schedules and prices go stale far faster
than a place existing.

**Critical design constraint, learned from a real prior bug**
(`geocodeStop()` used to cache upstream errors as if they were genuine
"doesn't exist" results, poisoning entries for 24h — fixed, plus a
one-time purge migration, earlier in this codebase's history): this
cache is designed from day one to never repeat that mistake. An upstream
error or non-2xx response from `/api/verify-leg` is **never** written to
`_verifyCache` — only a genuine 2xx `{unchanged:true}` (Brave had nothing
better) or a genuine 2xx patch result gets cached. A transient failure
just gets silently retried on the next route generation, not treated as
a confirmed answer.

---

## 6. The patch itself

**Why a targeted DOM patch, not a full re-render:** Route Results
(`renderPlanSuggestion()`) builds one big HTML string and commits it via a
single `innerHTML =` on every call. Re-running that after every
verification response would lose scroll position and any other
in-progress UI state (expanded booking panels, etc.) for what should be a
single small update.

- The leg-card template was extracted into its own function,
  `_renderLegCard3(d, i)`, with a stable `id="res-leg-card-${i}"` wrapper
  — the one thing this feature needed that didn't already exist anywhere
  in the render pipeline.
- `_applyLegVerification(d, i, result)` first checks a **meaningfully
  different** gate — confidence changed, cost differs by more than 15%,
  notes changed, or a new source link appeared — before doing anything.
  Brave merely *confirming* the model's original guess produces no patch
  and no pulse.
- It also checks `d === lastSuggestion` before touching the DOM — if the
  user has already navigated to a different search, a slow-arriving
  verification result is silently dropped rather than patching a screen
  the user isn't even looking at anymore.
- On a real change: mutate the leg object in place, re-render just that
  card via `_renderLegCard3`, swap it in with `card.outerHTML = ...`, and
  add `.leg-verify-pulse` for a one-time animation (`recBlink`, 3
  iterations — every other `recBlink` usage in the codebase is an
  *ongoing* live-status indicator; this is deliberately a single
  transient "we just double-checked this" cue, not a new live-status
  pattern).

---

## 7. Data model

New field on both leg shapes:
- Raw AI-suggestion leg: `source_url` (snake_case, matching the AI
  response's own convention)
- Saved-trip leg (after `suggestionToStopsLegs()`): `sourceUrl`
  (camelCase, matching that shape's convention)

A citation link icon renders next to the confidence badge whenever
`source_url`/`sourceUrl` is present — on Route Results immediately, and on
Journey Detail's leg cards too, since by the time a trip is saved the
value is just being displayed, not re-fetched.

---

## 8. Proxy — `POST /api/verify-leg`

`proxy/server.js`, following the same request/error-shape conventions as
`/api/ai` and `/api/geocode`. Body: `{from, to, mode}`. Requires
`BRAVE_API_KEY` (see `proxy/README.md`) — without it, every call returns
500 and the frontend silently no-ops (route suggestions still work
exactly as before, just without the background double-check). No
`Cache-Control` header — results are time-sensitive; all caching is
client-side, keyed by leg identity, not URL.

Response contract:
- `{unchanged: true}` — Brave found nothing useful. Cacheable negative.
- `{unchanged: false, confidence?, cost_usd?, notes?, source_url?}` — a
  candidate patch.
- Non-2xx — a real upstream/transient failure. The frontend must never
  treat this as either of the above.

---

## 9. Out of scope (v1)

- Verification for already-`verified` legs
- Re-verification on a schedule, or when a saved trip is reopened later
- A generic "ask AI to fact-check this" framework beyond this one flow
