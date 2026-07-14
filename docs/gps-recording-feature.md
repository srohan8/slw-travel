# GPS Live Recording — Feature Doc
**bysloth / slw.travel · v1.1 · 2026-06-29**

---

## 1. Overview

A Polar Steps-style live GPS recording feature. The user hits Record, puts their phone in their pocket, and the app silently tracks their overland journey in the background — auto-detecting cities, creating stops, inferring transport modes, and building a trip journal they can publish when done.

Two recording modes, triggered automatically by context — no choice required from the user.

---

## 2. Recording Modes

### Mode A — Planned vs Actual (context: Journey Detail of an unrecorded trip)
User opens a planned trip they've already built in the planner, taps the FAB. The GPS recording runs *against* the existing plan:

- **Planned stops stay visible** — shown greyed out until confirmed by GPS
- **GPS arrival confirms a stop** — when dwell is detected within ~5km of a planned stop, it lights up as visited with the real arrival time and duration
- **Unplanned stops** detected in between are added as extras (flagged as `_unplanned: true`)
- **Result**: a planned vs actual comparison — user can see where they deviated, what they skipped, what they discovered

### Mode B — Fresh Recording (context: Home / Planner / My Trips)
No prior plan. GPS builds the trip from scratch:

- Stops auto-created purely from dwell detection
- Legs inferred from speed between stops
- New blank trip created and saved to My Trips on finish

### FAB behaviour summary

| Where user taps FAB | Mode triggered |
|---|---|
| Home / Planner / My Trips | Mode B — fresh recording |
| Journey Detail (unrecorded planned trip) | Mode A — planned vs actual |
| Journey Detail (already recording) | Opens live recording screen |

---

## 3. Goals

- Let travelers document trips they didn't pre-plan
- Remove the friction of manually adding stops and legs
- Produce the same trip format as the planner → publishable journal
- Work fully offline (essential for overland travel)
- Not drain battery on multi-day trips

---

## 3. Platform

**Mobile only** — Android via Capacitor (background geolocation requires native APIs).  
Desktop: Record button is hidden. Users see a "Mobile only" tooltip if they discover the entry point on desktop.

---

## 3.5. Rollout gating — `profiles.gps_beta`

The permission-sequencing engine (§11) is functional but still being
hardened against real-device edge cases across OEMs/Android versions.
Rather than a general tier/pricing system, access is controlled by a
single admin-togglable boolean:

- `profiles.gps_beta` (migration `supabase/migrations/20260714_gps_beta_flag.sql`),
  mirroring `profiles.is_admin`'s exact shape and RLS pattern.
- Refreshed into the global `hasGpsBeta` alongside `isAdminUser` in
  `updateNavAuth()` (`app/index.html`) — one query, no extra round trip.
- `openGpsPerms()` gates on it: non-beta users are routed straight to a
  new permission-flow step (30) explaining tracking is in testing, with a
  CTA into manual journaling — never the real permission sequence.
- **Manual tracking is never gated.** `gpsStartManualFromJourney()` /
  `gpsSkipToManual()` are completely independent of `openGpsPerms()` and
  stay available to every user regardless of `gps_beta`.
- Toggled per-user from **Admin > Beta features** (look up by email, flip
  a checkbox) — protected by a Postgres RLS policy (admins can update any
  profile), not just UI-level hiding.

No general feature-flag framework was built on top of this — if more
beta flags are needed later, add more boolean columns following this
same pattern rather than generalizing prematurely.

---

## 4. Core Logic — Stop & Leg Detection

### Stop detection (dwell algorithm)
1. GPS position sampled continuously (adaptive rate — see §8)
2. If position hasn't moved **>500m for 20–30 minutes** → declare a stop
3. Reverse geocode the centroid → get place name + country
4. Create a stop entry: `{ name, country, lat, lng, arrived_at, departed_at }`

### Leg detection
- A leg is created between two consecutive stops
- **Mode inferred from median speed** during the leg:
  | Median speed | Inferred mode |
  |---|---|
  | < 7 km/h | walking |
  | 7–25 km/h | cycling |
  | 25–100 km/h | bus / car |
  | 100–250 km/h | train |
  | > 250 km/h | flight |
- Distance = sum of GPS segment distances
- Duration = `departed_at - arrived_at` of previous stop

### Reverse geocoding
- Uses [Nominatim](https://nominatim.openstreetmap.org/) (free, no key)
- Queued offline, resolved on reconnect
- Fallback: `lat, lng` as placeholder until geocoded

### Short-pause suggestions ("Possible stops")
A dwell of 3–20 minutes doesn't cross the auto-stop threshold, but isn't
nothing either — a border check, a viewpoint, a quick coffee stop. Instead
of silently discarding these, they're surfaced as dismissible suggestions
(`_gps.suggestions[]`) on the Journey Detail live view — "Add" promotes one
into a real stop through the same creation path the dwell algorithm uses;
"Dismiss" drops it. Anything under 3 minutes is still ignored entirely.

### Map trail
The recorded GPS positions (not just the stop-to-stop line) are simplified
with Douglas-Peucker (~18m tolerance — preserves curve shape rather than
just reducing point count) and saved to `trip.data.gps_trail` when
recording ends, so the journal's map draws the real path you travelled
instead of a straight line between stops.

---

## 5. Data Model

Recorded trips use the **exact same trip format** as planned trips so they slot into My Trips, Journey Detail, and publishing without conversion.

```js
{
  id: uuid,
  title: "Trip to...",           // user sets on review screen
  source: "recorded",            // distinguishes from "planned"
  recording_started: ISO string,
  recording_ended: ISO string,
  currency: "USD",
  stops: [
    {
      name: "Tbilisi",
      country: "Georgia",
      lat: 41.69, lng: 44.83,
      date: "2026-07-04",
      days: 3,
      visited: true,
      arrived_at: ISO string,
      departed_at: ISO string,   // written on stop creation and extended while still dwelling — leg
                                  // duration uses this, not arrived_at, so a long stay doesn't get
                                  // counted as travel time on the next leg
      diary: "...",              // user adds on review screen or during recording
      photos: [...],             // added during or after recording
      _recorded: true            // flag for UI badge
    }
  ],
  legs: [
    {
      from: "Istanbul",
      to: "Tbilisi",
      mode: "bus",
      km: 1480,
      hours: 22,
      cost: null,                // not auto-filled; user can add later
      notes: "",
      confidence: "verified",
      _recorded: true
    }
  ],
  data: {
    gps_trail: [[lat, lon], ...]   // Douglas-Peucker-simplified breadcrumb trail, appended per
                                    // recording session — drawn on the map instead of a straight
                                    // stop-to-stop line when present
  }
}
```

---

## 6. UX Flow

```
Bottom nav [Record] button
        │
        ▼
[Permission check]
  Location: always-on
  Background: required
  Camera: for photos
        │
        ▼
[Live Recording Screen]  ◄─── runs in background while phone locked
  ├─ Full-width map (Leaflet)
  │   ├─ Polyline trail (rust/orange color)
  │   ├─ Pulsing dot at current position
  │   └─ Stop pins as detected
  ├─ Stats bar: elapsed · distance · stops count
  ├─ Current location name (live, updates on new stop)
  ├─ Stops list (grows as detected)
  │   └─ Each stop: name · time · [📷 Add photo] [✏️ Note]
  └─ [■ Stop Recording] button (red, prominent)
        │
        ▼
[Review Screen]
  ├─ Trip title input (pre-filled: "Trip — [start city] to [last city]")
  ├─ Stops list (all auto-detected)
  │   ├─ Each stop: editable name · date · duration · photos · diary
  │   ├─ [Delete stop] (swipe left or trash icon)
  │   └─ [Add note / Add photo] per stop
  ├─ Legs summary (auto-filled: mode, distance, duration)
  ├─ [Save to My Trips] CTA
  └─ [Discard] link
        │
        ▼
[My Trips]
  └─ Trip appears with "● Recorded" badge
        │
        ▼
[Journey Detail] → same as any trip → [Publish Journal]
```

---

## 7. Live Recording Screen — Layout

```
┌─────────────────────────────┐
│                             │
│      [LEAFLET MAP]          │
│   trail drawn in rust       │
│   ● pulsing current pos     │
│   📍 stop pins              │
│                             │
├─────────────────────────────┤
│ 📍 Tbilisi, Georgia         │  ← current stop, live
│ 4h 32m  ·  312 km  ·  3 stops
├─────────────────────────────┤
│ STOPS DETECTED              │
│ ├ 📍 Istanbul    2d ago  📷✏️│
│ ├ 📍 Ankara     1d ago  📷✏️│
│ └ 📍 Tbilisi    now     📷✏️│
├─────────────────────────────┤
│  [📷 Photo]  [✏️ Note]      │  ← for current stop
│                             │
│   ■  STOP RECORDING         │
└─────────────────────────────┘
```

---

## 8. Battery & GPS Strategy

| State | Sample rate | Rationale |
|---|---|---|
| Moving fast (>25 km/h) | every 10s | Bus/train — need route accuracy |
| Moving slowly (<7 km/h) | every 30s | Walking — high density not needed |
| Stationary (dwell) | every 5 min | Just confirming still there |
| Screen on + map visible | every 5s | User is watching the map |

**Implementation:** Capacitor `@capacitor-community/background-geolocation` plugin.  
Battery impact target: <5% per hour on Android (comparable to Google Maps navigation).

---

## 9. Offline Behavior

| Data | Offline behavior |
|---|---|
| GPS tracking | ✅ Works — device hardware, no internet needed |
| Stop detection | ✅ Works — pure math on coordinates |
| Reverse geocoding | ⏳ Queued — filled in when back online, shows `lat,lng` as placeholder |
| Photos | ✅ Stored on device until sync |
| Supabase sync | ⏳ Queued — trip saved to localStorage immediately, pushed to cloud on reconnect |

---

## 10. My Trips — Visual Differentiation

Recorded trips get a `source: "recorded"` flag and a badge in the trip card:

```
┌─────────────────────────────┐
│ Istanbul → Tbilisi          │
│ ● Recorded  ·  Jul 4–8     │
│ 3 stops  ·  1,480 km       │
└─────────────────────────────┘
```

- Orange/rust `●` dot before "Recorded" label
- No mode/cost estimates (since they're auto-detected, not planned)

---

## 11. Permissions UX

Gated behind `profiles.gps_beta` first — see §3.5. Everything below only
runs for a beta-enabled user; everyone else lands on the manual-tracking
fallback screen instead.

First time the user taps Record:
1. Explain what's needed and why (one screen, not an OS dialog dump)
2. Request location permission
3. Request notification permission (Android 13+, via `@capacitor/local-notifications`) — needed to show the persistent tracking notification, which is what keeps the foreground service (and therefore location updates) alive once the screen locks. Best-effort: tracking still proceeds if denied.
4. Request background location ("Allow all the time") with explanation: *"We need this to track your route when your screen is off."* Requested via a small custom native plugin (`BackgroundLocationPerms`) *after* foreground location is confirmed granted — Android silently drops a background request bundled with or issued before the foreground grant.
5. If background location is permanently denied ("don't ask again"), offer an "Open Settings" deep-link instead of re-prompting — Android reports this via `shouldShowRequestPermissionRationale`.
6. If background location is granted but the app isn't exempt from battery optimization, offer (non-blocking, skippable) to request the exemption — some OEMs (Xiaomi, Samsung, Oppo) kill background services more aggressively than stock Android even with a valid foreground service.
7. Request camera (deferred — only when they tap 📷 for the first time)

If background location denied: show graceful fallback — *"Recording works but will pause when your screen is off. Keep the app open for best results."*

Order matters and is enforced in `gpsRequestAndStart()` (`app/index.html`):
foreground location → notifications → background location → optional
battery-exemption offer → start the real watcher/foreground service.

---

## 12. Build Chunks

| Chunk | What | Estimate |
|---|---|---|
| 1 | Capacitor background geolocation + dwell detection engine | Core |
| 2 | Live recording screen (map + stats + stop list + photo/note) | Core |
| 3 | Review & save screen | Core |
| 4 | My Trips badge + Journey Detail integration | Integration |
| 5 | Offline queue + Supabase sync | Polish |
| 6 | Reverse geocoding + mode inference | Polish |

Chunks 1–4 = MVP. 5–6 = full Polar Steps parity.

---

## 13. Resolved Edge Cases

### 1. Persistent recording indicator
A sticky red pulsing pill appears at the top of every in-app screen while recording is active:
```
● Recording · Tbilisi · 4h 32m   [tap to return]
```
Tapping it navigates back to the live recording screen. Hidden when recording is stopped.

### 2. Push notifications for stop detection
When dwell is detected (phone locked / screen off), fire a local push notification:
*"📍 You've arrived in Tbilisi, Georgia — tap to add a note."*
Tapping the notification deep-links to the live recording screen with that stop focused.
Requires `@capacitor/local-notifications` (no server needed — triggered on-device).

### 3. Manual stop creation
A **"+ Mark as stop"** button on the live recording screen overrides the dwell threshold — immediately creates a stop at the current GPS position. Useful for brief but meaningful moments (a border crossing, a viewpoint, a quick coffee stop).

### 4. Crash / battery recovery
GPS coordinates and stop data flushed to localStorage every 60 seconds. On next app open after a crash, if an incomplete recording is found, prompt: *"It looks like your recording was interrupted — resume or discard?"*

### 5. Pause / Resume
A **Pause** button on the live screen freezes GPS tracking without ending the trip. Useful for long layovers (airport, ferry terminal) where the user doesn't want an unwanted stop logged. Paused state shown clearly in the status pill: `⏸ Paused · Istanbul Airport`. Unwanted auto-detected stops can also be removed on the review screen.

### 6. Transport mode disambiguation + user override
Auto-inference from speed is a best guess. Two additions:
- **Water detection**: if the GPS track crosses a body of water (checked against map tile data or a simple coastline dataset), override bus/car inference to `ferry`
- **Flight detection**: speed >250 km/h → `flight`
- **User override**: on the review screen (and in Journey Detail after saving), each leg has an editable mode selector — user can correct any wrong inference. This is the safety net for all edge cases.

### 7. Photos storage — hybrid
Photos saved to device storage immediately (offline-safe, instant). Queued for upload to **Supabase Storage** when internet is available. Published journals reference the Supabase URL. Photos survive reinstall and are accessible across devices once synced.

### 8. Mode A — already-visited stops
On tapping the FAB from a planned trip where some stops are already `visited: true`:
1. App reads `trip.stops.filter(s => s.visited)` — this data already exists in the trip object, set by the user via Journey Detail or Record Journal today
2. Shows prompt: *"You've already completed Istanbul and Ankara — start recording from Tbilisi?"*
3. User confirms → GPS tracks from the first stop where `visited: false`
4. Already-visited stops retain their existing diary/photos unchanged
5. User can still attach gallery photos to old stops manually (not GPS-linked)

No new data or inference needed — `stop.visited` is already tracked per stop in the existing data model (see `jd-stop` toggle at line ~4555 in app/index.html).

## 14. Enforcing Mobile-Only — Guard Rules

> **Why this section exists.** The mobile bottom nav was silently wiped in a prior refactor (commit `564edf3`) and wasn't caught until a user reported it. The same failure mode applies here: GPS recording UI elements could be quietly removed or exposed on desktop during an unrelated edit. These rules exist to make that impossible to miss.

GPS recording requires native device APIs (background geolocation, local notifications) that have no browser equivalent. If they are called on desktop, they either throw or silently fail — there is no graceful degradation. The feature must be **invisible and inert on desktop at both the CSS and JS layer** — not just visually hidden, but never accidentally re-exposed by a future edit.

---

### Rule 1 — CSS: every recording element must be guarded

The following elements must **never appear on desktop (>640px)**:

| Element | Selector | Notes |
|---|---|---|
| Record button (bottom nav) | `#bnRecord` | Primary entry point |
| Live recording status pill | `#recordingPill` | Shown across all screens during active recording |
| Any future recording entry point | `.record-entry` | Apply this class to any new entry point added |

The guard block in `app/index.html` must always contain:

```css
@media (min-width: 641px) {
  #bnRecord,
  #recordingPill,
  .record-entry {
    display: none !important;
  }
}
```

**Rule:** adding a new recording-related UI element = adding it to this block in the same commit. There is no opt-out.

---

### Rule 2 — JS: platform check before any recording logic

Every function that touches the Capacitor geolocation or notifications API must gate on platform first. No exceptions — even if the element is already hidden by CSS (defence in depth):

```js
import { Capacitor } from '@capacitor/core';

function startRecording() {
  if (!Capacitor.isNativePlatform()) {
    // Should never be reachable — CSS hides the button — but guard anyway
    showTooltip('Live GPS recording is only available on the bysloth mobile app.');
    return;
  }
  // safe to call Capacitor APIs from here
}
```

**Never** call `BackgroundGeolocation.start()`, `LocalNotifications.schedule()`, or any Capacitor plugin directly without this guard wrapping it.

---

### Rule 3 — Never render the recording screen on desktop

If a desktop user somehow hits the recording route (e.g. via a manually typed URL or deep link), the app must redirect them away — not render a broken map or hang on a permissions dialog.

```js
// At the top of the recording screen init function:
if (!Capacitor.isNativePlatform()) {
  navigateTo('home');
  return;
}
```

---

### Rule 4 — Pre/post edit verification

Before **and** after any edit to `app/index.html` that touches the nav, FAB, or recording UI, run each of these checks individually. Every count must be **≥ 1** before and after:

```bash
grep -c "bnRecord" app/index.html
grep -c "recordingPill" app/index.html
grep -c "record-entry" app/index.html
grep -c "min-width.*641" app/index.html
grep -c "isNativePlatform" app/index.html
```

If **any count drops to 0** after your edit — stop. Do not commit. Restore the guard before proceeding.

Run the same checks when reviewing a PR that touches `app/index.html`.

---

### Rule 5 — The recording screen JS file is mobile-only by definition

If recording logic is extracted into its own file (e.g. `recording.js`), place this at the top:

```js
if (!Capacitor.isNativePlatform()) {
  throw new Error('recording.js loaded on non-native platform — check your import guard');
}
```

This makes an accidental desktop import a loud error, not a silent bug.

---

### Summary checklist (use before every commit touching recording UI)

- [ ] `#bnRecord` exists and is inside `@media (min-width: 641px) { display: none }` block
- [ ] `#recordingPill` exists and is inside the same block
- [ ] All 5 grep counts above are ≥ 1
- [ ] Every new recording entry point has the `.record-entry` class
- [ ] Every JS recording function starts with `if (!Capacitor.isNativePlatform()) return`
- [ ] Recording screen init redirects to home if not native

---

## 15. Out of Scope (v1)

- iOS support (Android first via Capacitor)
- Social feed / following other travelers
- Automatic expense tracking from location data
- Integration with Option A (planned trip recording) — that's a separate feature
- Real-time sharing / "watch my journey live"
