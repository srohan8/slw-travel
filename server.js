// ================================================================
// PROXY SERVER — slwtravel.com
// Deploy on Railway. Keeps Anthropic API key off the frontend.
// ================================================================
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS — only allow your domain ────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://slwtravel.com',
  'https://www.slwtravel.com',
  'http://localhost:3000',   // local dev
  'http://127.0.0.1:5500',  // VS Code Live Server
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '10kb' }));

// ── Rate limiting — IP based (Phase 1) ──────────────────────────
// Phase 2: swap to user-based limits from Supabase
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 requests per IP per hour
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/ai', limiter);

// ── AI proxy endpoint ────────────────────────────────────────────
app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      req.body.model      || 'claude-sonnet-4-20250514',
        max_tokens: req.body.max_tokens || 1200,
        messages:   req.body.messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'slwtravel-proxy' }));

app.listen(PORT, () => console.log(`slwtravel proxy running on port ${PORT}`));
