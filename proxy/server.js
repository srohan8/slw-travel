import express from 'express';
// Node 18+ has fetch built-in — no node-fetch needed

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS — allow GitHub Pages and local dev ──────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://srohan8.github.io',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
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

// ── POST /api/ai — forward to Anthropic ──────────────────────────────────────
app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: { message: 'Server misconfiguration: API key missing' } });
  }

  const { model, max_tokens, messages, system } = req.body || {};
  if (!messages?.length) {
    return res.status(400).json({ error: { message: 'messages array is required' } });
  }

  const body = {
    model:      model      || 'claude-sonnet-4-20250514',
    max_tokens: max_tokens || 8000,
    messages,
  };
  if (system) body.system = system;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);

    // Log usage to Supabase (fire-and-forget — don't block the response)
    if (upstream.ok && data.usage) {
      logUsageToSupabase(data.model, data.usage).catch(e => console.warn('Usage log failed:', e.message));
    }
  } catch (err) {
    console.error('Anthropic upstream error:', err);
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

// ── Supabase usage logger ────────────────────────────────────────────────────
const PRICES_PER_MTOK = { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 };

async function logUsageToSupabase(model, usage) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return; // env vars not set — skip silently

  const cost = (
    (usage.input_tokens                || 0) * PRICES_PER_MTOK.input       +
    (usage.output_tokens               || 0) * PRICES_PER_MTOK.output      +
    (usage.cache_read_input_tokens     || 0) * PRICES_PER_MTOK.cache_read  +
    (usage.cache_creation_input_tokens || 0) * PRICES_PER_MTOK.cache_write
  ) / 1_000_000;

  await fetch(`${sbUrl}/rest/v1/api_usage_log`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      model,
      input_tokens:                usage.input_tokens                || 0,
      output_tokens:               usage.output_tokens               || 0,
      cache_read_input_tokens:     usage.cache_read_input_tokens     || 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
      cost_usd: cost,
    }),
  });
}

app.listen(PORT, () => console.log(`slw-travel-proxy listening on :${PORT}`));
