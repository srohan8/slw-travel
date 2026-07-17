-- ── booking_sites: one-time cleanup of pre-fix duplicates + junk ────
-- Before commit b25d229 (merge-based dedup on auto-approve), the bulk
-- seed sweep created a separate row per country for the same operator
-- domain instead of merging into one record (busbud.com had 63+ rows in
-- the first 1000 checked, similar for wanderu.com/cargoholidays.com), and
-- ~19 stray quora.com/social-platform rows slipped through before the
-- host-reject-list existed. This is a one-time data cleanup, not a repeatable
-- migration -- run each step manually in the Supabase SQL editor and read
-- the preview output before running the destructive parts.
--
-- Run PART 0 first and review the output. Only proceed to PART 1/2 once
-- the preview counts look sane for this dataset.

-- ── PART 0: PREVIEW ONLY — run and read before anything else ────────

-- 0a. Junk/non-operator hosts that shouldn't be in booking_sites at all
-- (mirrors app/index.html's _SEED_NON_OPERATOR_HOSTS reject list).
select id, name, url_template, countries, created_at
from public.booking_sites
where regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2')
      ~ '(^|\.)(reddit|facebook|twitter|x|instagram|tiktok|pinterest|youtube|quora|medium|blogspot|linkedin)\.com$'
order by name;

-- 0b. Duplicate groups by root domain — what PART 2 will merge.
-- Eyeball the `templates` column: if a group's templates differ only in
-- query-string noise, a straight merge is safe. If they differ by path
-- (e.g. /uruguay.htm vs /fiji.htm — genuinely different URLs), PART 2's
-- per-country-override logic (added in 3a7fc02) preserves each one rather
-- than discarding all but one.
with domain_groups as (
  select id, name, url_template, countries, builtin, created_at,
         regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') as root_domain
  from public.booking_sites
)
select root_domain, count(*) as n,
       array_agg(name order by created_at) as names,
       array_agg(distinct url_template) as templates
from domain_groups
group by root_domain
having count(*) > 1
order by n desc;

-- ── PART 1: delete junk/non-operator rows ────────────────────────────
-- Guarded with builtin = false as a belt-and-braces check — no legitimate
-- builtin entry should ever match this pattern, but never delete one if
-- it somehow did.
delete from public.booking_sites
where regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2')
      ~ '(^|\.)(reddit|facebook|twitter|x|instagram|tiktok|pinterest|youtube|quora|medium|blogspot|linkedin)\.com$'
  and builtin = false;

-- ── PART 2: merge same-domain duplicates ─────────────────────────────
-- For each root-domain group with more than one row: keep a single
-- survivor (prefer an existing builtin row, else the oldest), union every
-- member's countries[] onto it, and for any member whose url_template
-- differs from the survivor's, fold that member's URL into the
-- survivor's country_url_overrides for its countries (so a genuinely
-- per-country URL like directferries.com/uruguay.htm isn't discarded —
-- see migration 20260718 and app/index.html's _buildUrlFn). Delete every
-- non-survivor row in the group afterward.
do $$
declare
  grp record;
  survivor public.booking_sites%rowtype;
  member public.booking_sites%rowtype;
  merged_countries text[];
  merged_overrides jsonb;
begin
  for grp in
    select regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') as root_domain
    from public.booking_sites
    group by 1
    having count(*) > 1
  loop
    select * into survivor
    from public.booking_sites
    where regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') = grp.root_domain
    order by builtin desc, created_at asc
    limit 1;

    merged_countries := coalesce(survivor.countries, '{}'::text[]);
    merged_overrides := coalesce(survivor.country_url_overrides, '{}'::jsonb);

    for member in
      select * from public.booking_sites
      where regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') = grp.root_domain
        and id <> survivor.id
    loop
      merged_countries := array(select distinct unnest(merged_countries || coalesce(member.countries, '{}'::text[])));
      if member.url_template is distinct from survivor.url_template
         and member.countries is not null and array_length(member.countries, 1) > 0 then
        merged_overrides := merged_overrides || (
          select jsonb_object_agg(c, member.url_template) from unnest(member.countries) as c
        );
      end if;
    end loop;

    update public.booking_sites
    set countries = merged_countries,
        country_url_overrides = merged_overrides,
        updated_at = now()
    where id = survivor.id;

    delete from public.booking_sites
    where regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') = grp.root_domain
      and id <> survivor.id;
  end loop;
end $$;

-- ── PART 3: sanity check — should return zero rows ───────────────────
with domain_groups as (
  select id, regexp_replace(lower(url_template), '^https?://(www\.)?([^/]+).*$', '\2') as root_domain
  from public.booking_sites
)
select root_domain, count(*) from domain_groups group by root_domain having count(*) > 1;
