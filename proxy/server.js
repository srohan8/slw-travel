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
  } catch (err) {
    console.error('Anthropic upstream error:', err);
    res.status(502).json({ error: { message: 'Upstream request failed: ' + err.message } });
  }
});

// ── GET /api/usage — Anthropic cost report (Admin API key required) ──────────
app.get('/api/usage', async (req, res) => {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_ADMIN_KEY not configured on proxy' } });
  }

  const ending   = req.query.ending_at   || new Date().toISOString();
  const starting = req.query.starting_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const width    = req.query.bucket_width || '1d';

  const params = new URLSearchParams({ starting_at: starting, ending_at: ending, bucket_width: width });

  try {
    const upstream = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params}`, {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': adminKey,
      },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Usage API error:', err);
    res.status(502).json({ error: { message: 'Upstream request failed: ' + err.message } });
  }
});

app.listen(PORT, () => console.log(`slw-travel-proxy listening on :${PORT}`));
