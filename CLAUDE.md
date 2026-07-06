# bysloth — Claude instructions

## Mobile design is critical — never break it

`app/index.html` has two completely separate navigation systems:

| System | Selector | Breakpoint |
|--------|----------|------------|
| Desktop top nav | `nav:not(#bottomNav)` | >640px |
| Mobile bottom nav | `#bottomNav .bn-item` | ≤640px |
| Mobile header | `#mobileHeader` | ≤640px |
| Mobile splash | `#mobileSplash` | ≤640px, logged-out |

**Before editing `app/index.html`**, run this check and confirm all 4 counts are non-zero:

```
grep -c "bottom-nav\|mobileHeader\|mobileSplash\|bnSync" app/index.html
```

**After editing**, run it again and compare. If any count dropped to 0, the mobile design was broken — stop and restore before committing.

### Rules

- Never remove the `@media(max-width:640px)` block
- Never remove `#bottomNav`, `#mobileHeader`, `#mobileSplash`
- Never remove `bnSync()`, `mobileHeaderSync()`, `updateMobileSplash()`
- Any change to the top `<nav>` must leave `nav:not(#bottomNav)` intact
- Desktop-only additions (dropdowns, avatar menus) must have `@media(max-width:640px){display:none !important;}` guard

### What happened (for context)

The mobile nav was silently wiped in commit `564edf3` during a nav refactor. It wasn't noticed until the user reported missing mobile navbar two sessions later. The fix was commit `926b6d5`.

## Journey Detail: GPS and manual tracking must stay in sync

Journey Detail's live view renders from the same markup for both GPS
(`_gps.mode==='gps'`) and manual (`_gps.mode==='manual'`) tracking. Shared UI
(leg cards, journal box, Add photos/Share tip, reorder arrows, mark-current
button) must be gated on `live` (`gps || manual`), never on `gps` alone,
unless the element is genuinely tracking-mode-specific:

- Current-stop ring highlight — GPS-only, signal-orange
- "You are here" (GPS) vs "current stop" (manual) badge text/color
- Live banner "TRACKING" vs "ACTIVE TRAVEL" label
- Day-stay badge "auto · from tracking" (GPS) vs "manual" text

**Any change to Journey Detail's live-tracking UI must be verified in both
GPS and manual mode before considering it done** — toggle `_gps.mode` between
`'gps'` and `'manual'` and confirm the same element renders identically
(aside from the exceptions above). This caught a real bug once already: a
current-stop ring that was accidentally showing in manual mode too.

## Never push without explicit user confirmation

Always commit locally, then ask "shall I push?" before running `git push`.

## Design system tokens

Rebranded to a mustard + ink palette (no blue) — the table below reflects
the actual current `:root` values in `app/index.html`, not the original
navy/orange scheme.

| Token | Value | Use |
|-------|-------|-----|
| `--dusk` | `var(--ink-900)` `#0A0A0A` | Nav background, dark surfaces |
| `--moss` | `var(--ink-800)` `#161616` | Secondary dark |
| `--fern` | `var(--ink-600)` `#2E2E2E` | Neutral dark accent (e.g. "planned" status) |
| `--sage` | `var(--mustard-500)` `#D9973D` | General brand/CTA accent — buttons, kickers, tab underlines |
| `--rust` | `var(--signal)` `#FF5014` | Same value as `--signal` — do not use for non-live UI |
| `--signal` | `#FF5014` | **Live/recording indicators ONLY** — tracking dots, "LIVE" pills, active-recording state. Never a generic accent. |
| `--cream` | `#FFFFFF` | Light text on dark |
| `--body` | `Albert Sans` | Body font |
| `--serif` | `Sora` | Headings |
| `--mono` | `JetBrains Mono` | Labels, metadata, footer |

**Important:** `--signal`/`--rust` are reserved exclusively for actual live
GPS/recording state (per the comment at `app/index.html:40`). If you're
tempted to reach for orange to make something stand out — a status badge,
a CTA, a kicker — use `--sage` (mustard) instead. Reusing `--signal` for a
non-live element visually implies "this is currently tracking," which is
misleading.

## Footer — consistent across all pages

All pages use the light border-top footer from `index.html`. Never use a dark `background:var(--dusk)` footer.

Footer CSS class: `.footer` (tool pages) / `.site-footer` (blog pages).
Footer always contains: bysloth logo + nav links + `© 2026 · Lisbon`.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (srohan8/slw-travel), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — no repo-specific mapping yet. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (neither exists yet — created lazily by `/grill-with-docs`). See `docs/agents/domain.md`.
