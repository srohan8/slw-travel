import express from 'express';
// Node 18+ has fetch built-in — no node-fetch needed

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS — allow GitHub Pages, local dev, and the native Android app ────────
const ALLOWED_ORIGINS = [
  'https://bysloth.com',
  'https://www.bysloth.com',
  'https://slw.travel',
  'https://www.slw.travel',
  'https://srohan8.github.io',
  'http://localhost:3333',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3333',
  // Capacitor's Android WebView serves the app from this origin by default
  // (capacitor.config.ts has no server.hostname/androidScheme override) —
  // without it every /api/ai call from the native app fails CORS, every time.
  'https://localhost',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ ok: true, service: 'slw-travel-proxy' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── AI provider settings (admin-configurable via admin_settings table) ───────
// ai_force_provider:   'claude'|'deepseek'|'openrouter'|'pollinations'|null
// ai_provider_chain:  JSON array — priority order for auto mode, e.g. ["pollinations","anthropic"]
// ai_model_*:         model overrides per provider (anthropic/deepseek/openrouter/pollinations)
async function getAiProviderSettings() {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return { failsafeEnabled: false, forceProvider: null, providerChain: null, modelOverrides: {} };
  try {
    const keys = [
      'ai_failsafe_enabled', 'ai_force_provider', 'ai_provider_chain',
      'ai_model_anthropic', 'ai_model_deepseek', 'ai_model_openrouter', 'ai_model_pollinations',
    ];
    const r = await fetch(
      `${sbUrl}/rest/v1/admin_settings?key=in.(${keys.join(',')})&select=key,value`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const rows = await r.json();
    const get = k => rows.find?.(row => row.key === k)?.value;
    const chainRaw = get('ai_provider_chain');
    const providerChain = Array.isArray(chainRaw) && chainRaw.length ? chainRaw : null;
    return {
      failsafeEnabled: get('ai_failsafe_enabled') === true,
      forceProvider: get('ai_force_provider') || null,
      providerChain,
      modelOverrides: {
        anthropic:   get('ai_model_anthropic')   || null,
        deepseek:    get('ai_model_deepseek')    || null,
        openrouter:  get('ai_model_openrouter')  || null,
        pollinations: get('ai_model_pollinations') || null,
      },
    };
  } catch (e) {
    console.warn('getAiProviderSettings failed, defaulting to Claude-only:', e.message);
    return { failsafeEnabled: false, forceProvider: null, providerChain: null, modelOverrides: {} };
  }
}

// ── POST /api/ai — forward to Anthropic, with optional DeepSeek failsafe ─────
app.post('/api/ai', async (req, res) => {
  const { max_tokens, messages, system, user_id } = req.body || {};
  if (!messages?.length) {
    return res.status(400).json({ error: { message: 'messages array is required' } });
  }

  // Model order: env var → hardcoded primary → fallback
  // To change without a deploy: set ANTHROPIC_MODEL in Railway env vars
  const PRIMARY_MODEL  = process.env.ANTHROPIC_MODEL  || 'claude-sonnet-4-6';
  const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL_FALLBACK || 'claude-haiku-4-5-20251001';
  const DEEPSEEK_MODEL     = process.env.DEEPSEEK_MODEL     || 'deepseek-chat';
  const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL   || 'anthropic/claude-sonnet-4-6';
  const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || 'openai';

  const callAnthropic = async (model) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { r: { ok: false, status: 500 }, data: { error: { message: 'Server misconfiguration: ANTHROPIC_API_KEY missing' } } };
    const body = { model, max_tokens: max_tokens || 16000, messages };
    if (system) body.system = system;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    return { r, data: await r.json() };
  };

  // Helper: normalize an OpenAI-compatible response into Anthropic shape
  // so the rest of this handler and the frontend need no provider-specific code.
  const normalizeOaiResponse = (raw, fallbackModel) => ({
    content: [{ type: 'text', text: raw.choices?.[0]?.message?.content || '' }],
    model:   raw.model || fallbackModel,
    usage: {
      input_tokens:  raw.usage?.prompt_tokens     || 0,
      output_tokens: raw.usage?.completion_tokens || 0,
    },
  });

  const callOaiCompat = async (url, model, apiKey, extraHeaders = {}) => {
    if (apiKey === null) return { r: { ok: false, status: 500 }, data: { error: { message: `Server misconfiguration: API key missing for ${url}` } } };
    const chatMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const r = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}), ...extraHeaders },
      body: JSON.stringify({ model, messages: chatMessages, max_tokens: max_tokens || 16000 }),
    });
    const raw = await r.json();
    if (!r.ok) return { r, data: raw };
    return { r, data: normalizeOaiResponse(raw, model) };
  };

  const callDeepSeek = (model) => callOaiCompat(
    'https://api.deepseek.com/chat/completions', model, process.env.DEEPSEEK_API_KEY
  );

  const callOpenRouter = (model) => callOaiCompat(
    'https://openrouter.ai/api/v1/chat/completions', model, process.env.OPENROUTER_API_KEY,
    { 'HTTP-Referer': 'https://bysloth.com', 'X-Title': 'bysloth' }
  );

  // Pollinations AI is free with no API key required
  const callPollinations = (model) => callOaiCompat(
    'https://text.pollinations.ai/openai', model, ''
  );

  const { failsafeEnabled, forceProvider, providerChain, modelOverrides } = await getAiProviderSettings();

  // Resolve effective models: admin override > env var > hardcoded default
  const anthropicModel    = modelOverrides.anthropic    || PRIMARY_MODEL;
  const deepseekModel     = modelOverrides.deepseek     || DEEPSEEK_MODEL;
  const openrouterModel   = modelOverrides.openrouter   || OPENROUTER_MODEL;
  const pollinationsModel = modelOverrides.pollinations  || POLLINATIONS_MODEL;

  // Map provider name → caller function
  const tryProvider = async (name) => {
    if (name === 'anthropic' || name === 'claude') {
      let res = await callAnthropic(anthropicModel);
      if (!res.r.ok && res.data.error?.type === 'not_found_error') {
        console.warn(`Anthropic model ${anthropicModel} not found, falling back to ${FALLBACK_MODEL}`);
        res = await callAnthropic(FALLBACK_MODEL);
      }
      return { ...res, usedProvider: 'claude' };
    }
    if (name === 'deepseek')     return { ...(await callDeepSeek(deepseekModel)),     usedProvider: 'deepseek' };
    if (name === 'openrouter')   return { ...(await callOpenRouter(openrouterModel)),   usedProvider: 'openrouter' };
    if (name === 'pollinations') return { ...(await callPollinations(pollinationsModel)), usedProvider: 'pollinations' };
    return { r: { ok: false, status: 400 }, data: { error: { message: `Unknown provider: ${name}` } }, usedProvider: name };
  };

  try {
    let r, data, usedProvider = 'claude';

    if (forceProvider && forceProvider !== 'auto') {
      // Explicit force — use exactly that provider, no fallback
      ({ r, data, usedProvider } = await tryProvider(forceProvider));
    } else {
      // Auto mode: iterate provider chain in priority order, stop at first success
      const chain = providerChain || (failsafeEnabled ? ['anthropic', 'deepseek'] : ['anthropic']);
      for (const name of chain) {
        ({ r, data, usedProvider } = await tryProvider(name));
        if (r.ok) break;
        console.warn(`Provider ${name} failed (${data.error?.message || r.status}), trying next in chain…`);
      }
    }

    res.status(r.status).json(data);

    // Log usage to Supabase (fire-and-forget — don't block the response)
    if (r.ok && data.usage) {
      logUsageToSupabase(data.model, data.usage, usedProvider.startsWith('deepseek') ? 'deepseek' : 'claude', user_id || null)
        .catch(e => console.warn('Usage log failed:', e.message));
    }
  } catch (err) {
    console.error('AI upstream error:', err);
    res.status(502).json({ error: { message: 'Upstream request failed: ' + err.message } });
  }
});


// ── GET /api/elevation — proxy to Open-Topo-Data (CORS bypass) ──────────────
app.get('/api/elevation', async (req, res) => {
  const { locations } = req.query;
  if (!locations) return res.status(400).json({ error: 'locations query param required' });
  try {
    const upstream = await fetch(
      `https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(locations)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await upstream.json();
    // Elevation data is static — cache aggressively at CDN/browser level
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: 'Elevation upstream error: ' + err.message } });
  }
});

// ── GET /api/geocode — proxy to Komoot Photon (CORS bypass) ─────────────────
// Photon doesn't send Access-Control-Allow-Origin, so browser-side fetch()
// calls to it are blocked from any real origin (bysloth.com, etc.) — every
// geocodeStop() call in app/index.html was failing silently for this reason,
// which is why route maps showed disconnected gaps between stops.
app.get('/api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q query param required' });
  try {
    const upstream = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await upstream.json();
    // Place names don't move — cache aggressively
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: 'Geocode upstream error: ' + err.message } });
  }
});

// ── POST /api/verify-leg — ground a shaky AI-suggested leg against Brave's
// Answers API. planRoute()'s AI call sets each leg's confidence purely from
// model recall (no web grounding) -- for legs it already flags check/
// uncertain, this asks Brave for a real, cited answer and lets the frontend
// decide whether to patch the leg. No Cache-Control here: results are
// time-sensitive (schedules/prices), caching lives client-side only, keyed
// by leg identity not URL.
app.post('/api/verify-leg', async (req, res) => {
  const { from, to, mode } = req.body || {};
  if (!from || !to || !mode) {
    return res.status(400).json({ error: { message: 'from, to, and mode are required' } });
  }
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Server misconfiguration: BRAVE_API_KEY missing' } });
  }
  const q = `${mode} from ${from} to ${to} - current schedule, price, does it still operate? Answer briefly with a source.`;
  try {
    // Brave Answers is an OpenAI-compatible chat-completions endpoint, not a
    // plain GET search -- POST with messages/model, citations come back
    // embedded as <citation>{...}</citation> tags inside the message content.
    const upstream = await fetch('https://api.search.brave.com/res/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-subscription-token': apiKey },
      body: JSON.stringify({
        messages: [{ role: 'user', content: q }],
        model: 'brave',
        stream: false,
        extra_body: { enable_citations: true },
      }),
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      // Non-JSON upstream body (HTML error page, etc.) -- treat exactly like
      // a non-2xx: a real failure, never a cacheable "nothing better found".
      return res.status(502).json({ error: { message: 'Verify-leg upstream returned non-JSON: ' + raw.slice(0, 200) } });
    }
    if (!upstream.ok) {
      // An upstream error is NOT the same as "Brave found nothing better" --
      // the frontend must never cache this as a negative result, or a
      // transient failure gets treated as a permanent "confirmed unchanged"
      // (the exact bug class just fixed in geocodeStop()'s res.ok check).
      return res.status(502).json({ error: { message: 'Verify-leg upstream error: ' + (data?.error?.detail || data?.error?.message || upstream.status) } });
    }
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content.trim()) return res.json({ unchanged: true }); // genuine, cacheable negative

    const citations = [...content.matchAll(/<citation>([\s\S]*?)<\/citation>/g)]
      .map(m => { try { return JSON.parse(m[1]); } catch (e) { return null; } })
      .filter(Boolean);
    const text = content.replace(/<citation>[\s\S]*?<\/citation>/g, '').replace(/<usage>[\s\S]*?<\/usage>/g, '').trim();
    if (!text) return res.json({ unchanged: true });

    const priceMatch = text.match(/\$\s?(\d+(?:\.\d+)?)/);
    const negativeMatch = /suspended|no longer (runs?|operates?)|discontinued|cancell?ed|does not operate/i.test(text);
    res.json({
      unchanged: false,
      confidence: negativeMatch ? 'uncertain' : 'check',
      cost_usd: priceMatch ? Number(priceMatch[1]) : undefined,
      notes: text.slice(0, 280),
      source_url: citations[0]?.url || null,
    });
  } catch (err) {
    res.status(502).json({ error: { message: 'Verify-leg upstream error: ' + err.message } });
  }
});

// ── GET /api/brave-web-search — raw Brave Web Search results (prototype only).
// Distinct from /api/verify-leg (Brave Answers, a synthesized/cited response)
// -- this returns the plain search-result list, for the booking-link-compare
// prototype (prototype/booking-link-compare.html) to eyeball against the
// app's curated DEFAULT_SITES fallback on thin-coverage corridors (Iran,
// Central Asia, etc). Not called from the main app.
app.get('/api/brave-web-search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: { message: 'q query param required' } });
  // Search and Answers are separate Brave subscriptions/keys -- confirmed
  // after Answers itself needed a distinct plan (OPTION_NOT_IN_PLAN, see
  // /api/verify-leg's history). Don't reuse BRAVE_API_KEY here.
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Server misconfiguration: BRAVE_SEARCH_API_KEY missing' } });
  }
  try {
    const upstream = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`,
      { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } }
    );
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      return res.status(502).json({ error: { message: 'Web-search upstream returned non-JSON: ' + raw.slice(0, 200) } });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: { message: 'Web-search upstream error: ' + (data?.error?.detail || data?.error?.message || upstream.status) } });
    }
    const results = (data?.web?.results || []).map(r => ({ title: r.title, url: r.url, description: r.description }));
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: { message: 'Web-search upstream error: ' + err.message } });
  }
});

// ── POST /api/queue-seed-result — write raw Brave results into
// booking_sites_pending using the service key (mirrors /api/verify-leg's
// validation/error-shape conventions). Needed because the reactive
// first-time-country trigger (app/index.html's _maybeTriggerReactiveSeed)
// fires from a regular, non-admin user's browser session — that session
// can't satisfy booking_sites_pending's is_admin-gated insert RLS directly,
// so this one write path goes through the service key server-side instead.
// The admin-triggered bulk sweep also flows through here for consistency,
// so admins have one single review surface instead of two.
app.post('/api/queue-seed-result', async (req, res) => {
  const { country_code, category, results, trigger_source } = req.body || {};
  if (!country_code || !category || !Array.isArray(results) || !results.length) {
    return res.status(400).json({ error: { message: 'country_code, category, and a non-empty results array are required' } });
  }
  const source = trigger_source === 'reactive_new_country' ? 'reactive_new_country' : 'bulk_seed';
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: { message: 'Server misconfiguration: SUPABASE_URL/SUPABASE_SERVICE_KEY missing' } });
  }
  const rows = results.slice(0, 20).map(r => ({
    country_code, category,
    title: r.title || '', url: r.url || '', description: r.description || '',
    trigger_source: source,
  })).filter(r => r.url);
  if (!rows.length) return res.status(400).json({ error: { message: 'No results had a usable url' } });
  try {
    const upstream = await fetch(`${sbUrl}/rest/v1/booking_sites_pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!upstream.ok) {
      const raw = await upstream.text();
      return res.status(502).json({ error: { message: 'Queue-seed-result upstream error: ' + raw.slice(0, 200) } });
    }
    res.json({ ok: true, queued: rows.length });
  } catch (err) {
    res.status(502).json({ error: { message: 'Queue-seed-result upstream error: ' + err.message } });
  }
});

// ── Supabase usage logger ────────────────────────────────────────────────────
// NOTE: DeepSeek figures are an approximation as of this writing (deepseek-chat,
// standard non-cached rate) — verify against https://api-docs.deepseek.com/quick_start/pricing
// and update if this is going to be relied on for real cost tracking.
const PRICES_PER_MTOK = {
  claude:   { input: 3,    output: 15,   cache_read: 0.3, cache_write: 3.75 },
  deepseek: { input: 0.28, output: 0.42, cache_read: 0,   cache_write: 0    },
};

async function logUsageToSupabase(model, usage, provider = 'claude', userId = null) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) {
    console.warn('logUsageToSupabase: SUPABASE_URL/SUPABASE_SERVICE_KEY not set — usage not logged');
    return;
  }

  const prices = PRICES_PER_MTOK[provider] || PRICES_PER_MTOK.claude;
  const cost = (
    (usage.input_tokens                || 0) * prices.input       +
    (usage.output_tokens               || 0) * prices.output      +
    (usage.cache_read_input_tokens     || 0) * prices.cache_read  +
    (usage.cache_creation_input_tokens || 0) * prices.cache_write
  ) / 1_000_000;

  const res = await fetch(`${sbUrl}/rest/v1/api_usage_log`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      model,
      user_id: userId,
      input_tokens:                usage.input_tokens                || 0,
      output_tokens:               usage.output_tokens               || 0,
      cache_read_input_tokens:     usage.cache_read_input_tokens     || 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
      cost_usd: cost,
    }),
  });

  // fetch() only rejects on network failure — a bad key/schema mismatch/RLS
  // issue comes back as a non-2xx response and would otherwise be silently
  // dropped, since the caller only .catch()es rejections. Throw so it
  // actually surfaces in the Railway logs.
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase insert failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

app.listen(PORT, () => console.log(`slw-travel-proxy listening on :${PORT}`));
