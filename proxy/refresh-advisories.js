// SLW Travel · Daily conflict-zone refresh
// ─────────────────────────────────────────
// Pulls travel-advisory levels from the UK FCDO content API and the
// Government of Canada open data, upserts them into Supabase
// `conflict_zones`. Runs daily on Railway cron (or any scheduler).
//
// Tier 1 (this job writes): FCDO + Canada → level, summary, source_updated_at.
// Tier 2 (seeded by schema): State Dept / Smartraveller / Germany / France / Japan
//                            are per-country deep-link URLs for cross-checking.
//                            We don't scrape them — they're stored in the seed.
//
// Run: node refresh-advisories.js
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Country registry ────────────────────────────────────────────────
// ISO-2 → { fcdoSlug, canadaSlug }. The refresh job is opt-in per country:
// only countries listed here get refreshed. Add rows to the seed in
// supabase-schema.sql AND to this list to bring a new country online.
const COUNTRIES = [
  { code:'AF', fcdo:'afghanistan',      canada:'afghanistan'  },
  { code:'MM', fcdo:'myanmar-burma',    canada:'myanmar'      },
  { code:'SD', fcdo:'sudan',            canada:'sudan'        },
  { code:'SS', fcdo:'south-sudan',      canada:'south-sudan'  },
  { code:'SY', fcdo:'syria',            canada:'syria'        },
  { code:'YE', fcdo:'yemen',            canada:'yemen'        },
  { code:'SO', fcdo:'somalia',          canada:'somalia'      },
  { code:'LY', fcdo:'libya',            canada:'libya'        },
  { code:'KP', fcdo:'north-korea',      canada:'korea-north'  },
  { code:'UA', fcdo:'ukraine',          canada:'ukraine'      },
  { code:'RU', fcdo:'russia',           canada:'russia'       },
  { code:'BY', fcdo:'belarus',          canada:'belarus'      },
  { code:'IR', fcdo:'iran',             canada:'iran'         },
  { code:'IQ', fcdo:'iraq',             canada:'iraq'         },
  { code:'HT', fcdo:'haiti',            canada:'haiti'        },
  { code:'VE', fcdo:'venezuela',        canada:'venezuela'    },
  { code:'ML', fcdo:'mali',             canada:'mali'         },
  { code:'PK', fcdo:'pakistan',         canada:'pakistan'     },
  { code:'LB', fcdo:'lebanon',          canada:'lebanon'      },
  { code:'IN', fcdo:'india',            canada:'india'        },
];

// ── FCDO: gov.uk Content API ────────────────────────────────────────
// https://www.gov.uk/api/content/foreign-travel-advice/{slug}
// alert_status entries → our level.
const FCDO_STATUS_TO_LEVEL = {
  avoid_all_travel:              'war',
  avoid_all_but_essential_travel:'conflict',
  see_our_travel_advice_before_travelling:'tension',
  // everything else → 'advisory'
};

async function fetchFCDO(slug) {
  const r = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`);
  if (!r.ok) throw new Error(`FCDO ${slug}: ${r.status}`);
  const json = await r.json();
  const alerts = json.details?.alert_status || [];
  let level = 'advisory';
  for (const s of alerts) {
    const mapped = FCDO_STATUS_TO_LEVEL[s];
    if (mapped === 'war')      { level = 'war'; break; }
    if (mapped === 'conflict' && level !== 'war') level = 'conflict';
    else if (mapped === 'tension' && level === 'advisory') level = 'tension';
  }
  const summary = (json.description || '').split('.')[0].slice(0, 200);
  const updated = json.public_updated_at || json.updated_at || null;
  return { level, summary, source_updated_at: updated };
}

// ── Canada: travel.gc.ca open data ──────────────────────────────────
// Endpoint shape has shifted historically — verify against
// https://travel.gc.ca/api/ before relying on it. We parse defensively.
async function fetchCanada(slug) {
  const url = `https://travel.gc.ca/destinations/${slug}`;
  const r = await fetch(url, { headers: { 'Accept':'application/json' } });
  if (!r.ok || !r.headers.get('content-type')?.includes('json')) {
    // Canada doesn't always serve JSON for the destination page; treat
    // as a soft failure — FCDO remains authoritative for level.
    return null;
  }
  // Minimal parse — level comes from FCDO; we only use Canada for
  // timestamp cross-reference when available.
  const json = await r.json().catch(() => null);
  return json?.updatedAt ? { source_updated_at: json.updatedAt } : null;
}

// ── Refresh one country ─────────────────────────────────────────────
async function refresh({ code, fcdo, canada }) {
  try {
    const f = await fetchFCDO(fcdo);
    const c = await fetchCanada(canada).catch(() => null);
    const source_updated_at = c?.source_updated_at || f.source_updated_at;

    const { error } = await sb.from('conflict_zones').update({
      level: f.level,
      summary: f.summary,
      source_updated_at,
      reviewed_at: new Date().toISOString(),
    }).eq('country_code', code);

    if (error) throw error;
    console.log(`  ${code} → ${f.level}  (${f.summary.slice(0,60)}…)`);
  } catch (e) {
    console.warn(`  ${code} FAILED: ${e.message}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`Refreshing ${COUNTRIES.length} conflict zones from FCDO + Canada…`);
  for (const country of COUNTRIES) {
    await refresh(country);
    await new Promise(r => setTimeout(r, 250));   // polite pacing
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
