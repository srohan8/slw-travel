# proxy/refresh-advisories.js

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
