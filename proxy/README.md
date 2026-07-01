# proxy/ — Railway-hosted services

Two independent scripts, both deployed to Railway from this repo:

- **`server.js`** — the main AI/geocoding/elevation proxy. Always-on web service.
- **`refresh-advisories.js`** — daily cron job, refreshes travel advisories. See its own section below.

---

# server.js — AI, geocoding & elevation proxy

Exists so the frontend (`app/index.html`) never calls third-party APIs
directly from the browser — either because the API doesn't send CORS
headers (Photon, Open-Topo-Data) or because the call needs a secret key
that can't live in client-side code (Anthropic, DeepSeek).

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check — `{ok:true}`. Hit this first when debugging a "proxy seems down" report before assuming it's actually down (see CORS gotcha below). |
| `/api/ai` | POST | Forwards to Anthropic (or DeepSeek, if forced/failed-over — see below). Body: `{messages, system?, max_tokens?}`. |
| `/api/elevation` | GET | Proxies Open-Topo-Data SRTM90m. Query: `?locations=lat,lon\|lat,lon\|...`. |
| `/api/geocode` | GET | Proxies Komoot Photon. Query: `?q=<place name>`. |

## Env vars

```
ANTHROPIC_API_KEY=...        # required
SUPABASE_URL=...             # required — for usage logging + AI provider settings
SUPABASE_SERVICE_KEY=...     # required — service role, not anon key
DEEPSEEK_API_KEY=...         # optional — only needed if the failsafe/force-provider option is used
ANTHROPIC_MODEL=...          # optional override, default claude-sonnet-4-6
ANTHROPIC_MODEL_FALLBACK=... # optional override, default claude-haiku-4-5-20251001
DEEPSEEK_MODEL=...           # optional override, default deepseek-chat
```

## AI provider failsafe

Controlled from **Admin > AI provider** in the app (writes to Supabase's
`admin_settings` table, keys `ai_failsafe_enabled` / `ai_force_provider`).
Claude is always tried first unless force-set to `deepseek`. If Claude's
call fails and failsafe is enabled (and force isn't pinned to `claude`),
it retries once against DeepSeek before giving up. See the comments
around `getAiProviderSettings()` in `server.js` for the exact logic.

## CORS

`ALLOWED_ORIGINS` in `server.js` is an explicit allowlist (production
domains + a few local dev ports). A request from an origin **not** on
that list still gets a real HTTP response from the server (including a
200/204 on the OPTIONS preflight) — it just won't carry the
`Access-Control-Allow-Origin` header, so the browser blocks it with a
plain `net::ERR_FAILED` / "Failed to fetch". **This looks identical to
the service actually being down.** Before concluding the proxy is
unreachable, check the Network tab (not just the JS-level fetch error)
for a real HTTP status on the OPTIONS preflight, or test from an
allowlisted origin/port. Don't add a new local dev port to this list
without also checking it's a port you actually intend to keep testing
from.

## Deploy (Railway) — read this before touching build config

**The Railway service's Root Directory is the repo root, not `proxy/`.**
That's why the build is driven by `nixpacks.toml` at the repo root
(`cd proxy && npm install --production`, `node proxy/server.js`)
instead of `proxy/railway.json` sitting in this folder — Railway never
looks inside `proxy/` for its own config unless Root Directory is
changed to point here directly. `proxy/railway.json` currently exists
but is **not active** under the current Root Directory setting; it's
a leftover from when this was presumably deployed with Root Directory
set to `proxy/` directly. Don't assume editing it affects the live
deploy without first confirming which one Railway is actually reading.

**Why the root `nixpacks.toml` has `providers = ["node"]`:** the repo
root also has a `Gemfile` (Jekyll site) and `package.json` (Capacitor
tooling) sitting next to it. Nixpacks auto-detects the project's
language *before* running any custom phase commands in this file —
customizing `[phases.build]` does not override that initial provider
choice. With both a Gemfile and package.json present, that detection
is inherently ambiguous; it apparently resolved to Node on earlier
deploys (Railway's build cache), but a fresh scan can just as validly
pick Ruby instead, which happened on 2026-07-01 (build tried to
install Ruby via rbenv and crashed on `gem install bundler`, having
nothing to do with any actual proxy code change). `providers = ["node"]`
forces the choice explicitly so this can't happen regardless of what
Railway's cache does.

If you ever change the Root Directory to `proxy/` directly, the root
`nixpacks.toml` becomes irrelevant and `proxy/railway.json` /
`proxy/railpack.json` take over instead — don't maintain both build
paths at once without noting which one is actually active.

---

# refresh-advisories.js

Daily cron job that refreshes `public.conflict_zones` in Supabase from the
UK FCDO content API and the Government of Canada travel advice pages.

## What it does

1. For each ISO-2 country in the `COUNTRIES` list, fetches
   `https://www.gov.uk/api/content/foreign-travel-advice/{slug}` and
   maps the FCDO `alert_status` to our level (`war` / `conflict` /
   `tension` / `advisory`).
2. Upserts `level`, `summary`, `source_updated_at`, `reviewed_at`.
3. Tier-2 deep-links (State Dept, Smartraveller, Germany, France, Japan)
   are **not** refreshed — they're seeded in `supabase-schema.sql` and
   reviewed manually once a year.

## Env vars

```
SUPABASE_URL=https://xhbgplwahgdmqomgyjuo.supabase.co
SUPABASE_SERVICE_KEY=<service role key — not the anon key>
```

The service key is required because `conflict_zones` RLS only permits
reads; writes require the service role.

## Deploy

### Railway (recommended — same platform as the AI proxy)

1. Create a new Railway service pointing at this folder.
2. Add env vars.
3. Cron: `0 3 * * *` (03:00 UTC daily).
4. Start command: `npm run refresh`.

### Supabase Edge Function (alternative)

Wrap `refresh-advisories.js` in a Deno-compatible function and schedule
with `pg_cron` or Supabase scheduled triggers.

## Adding a country

1. Add a seed row in `supabase-schema.sql` (the `insert into conflict_zones … values …` block) with the hand-crafted Tier-2 URLs.
2. Add the ISO-2 + FCDO + Canada slugs to the `COUNTRIES` array in `refresh-advisories.js`.
3. Run once locally to verify: `npm run refresh`.

## Caveats worth knowing

- **FCDO slugs** are not always `lowercase-country-name`. Verify by
  visiting `gov.uk/foreign-travel-advice/{slug}` before adding.
- **Canada endpoint** historically has shifted between HTML and JSON;
  the job treats a non-JSON response as a soft failure and keeps FCDO
  as the authoritative level source.
- **`reviewed_at` always updates** on a successful FCDO fetch, even if
  the level didn't change. That's what the UI shows as "Reviewed YYYY-MM-DD".
