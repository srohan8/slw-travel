# slwtravel.com — Overland Trip Planner

## File structure

```
slwtravel/
  index.html          ← Landing page + login (Supabase auth)
  app.html            ← Main app (plan, record, flights)
  admin.html          ← Admin control panel (password protected)
  config/
    affiliates.js     ← All affiliate link config (reference only)
    constants.js      ← Plans, limits, mode labels (reference only)
  js/
    auth.js           ← Supabase auth module (reference only)
    storage.js        ← Supabase storage module (reference only)
  proxy/
    server.js         ← Node.js proxy for Railway
    package.json
```

> Note: `config/` and `js/` files are reference modules.
> The live app embeds their logic directly in `app.html` for Phase 1.
> Phase 2 will split these into proper ES modules.

---

## Setup checklist

### 1. Supabase

1. Create project at supabase.com
2. Run the SQL from the setup guide in SQL Editor
3. Enable Google OAuth in Authentication → Providers
4. Copy your Project URL and anon key
5. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` in:
   - `index.html`
   - `app.html`
   - `admin.html`

### 2. Admin password

Replace `YOUR_ADMIN_PASSWORD` in `admin.html` with something strong.
Access the admin panel at: `https://slwtravel.com/admin.html`

### 3. Proxy (Railway)

1. Push the `proxy/` folder to a GitHub repo
2. Create a new Railway project → Deploy from GitHub
3. Add environment variable: `ANTHROPIC_API_KEY=your_key_here`
4. Copy the Railway deployment URL
5. Replace `YOUR_RAILWAY_PROXY_URL` in `app.html`
   e.g. `https://slwtravel-proxy.up.railway.app`

### 4. GitHub Pages

1. Push all files to GitHub repo
2. Settings → Pages → Deploy from main branch
3. Point slwtravel.com DNS to GitHub Pages (CNAME record)
4. In Supabase → Authentication → URL Configuration:
   - Site URL: `https://slwtravel.com`
   - Redirect URLs: `https://slwtravel.com/app.html`

### 5. Affiliate links

Open `app.html` and find the `AFF` object near the top of the script.
Drop your affiliate IDs into the URL builder functions.
Each partner has a comment showing where the ID goes.

---

## Admin panel controls

| Setting | Default | Effect |
|---|---|---|
| Maintenance mode | Off | Shows banner on landing page |
| Login required | Off | Gates app behind auth |
| New signups | On | Allow/block registrations |
| Affiliate links | On | Show/hide all booking links |
| Freemium limits | Off | Enforce monthly usage caps |
| Free plan limits | 3/3/1 | Route plans / flight searches / saved trips |

All changes are instant — no redeployment needed.

---

## Phase 2 upgrades (when ready)

- [ ] Split app.html into proper ES modules
- [ ] Enable freemium in admin panel
- [ ] Add Stripe for Pro subscriptions ($3/month)
- [ ] Trip sharing (public links)
- [ ] Mobile app (PWA)
- [ ] Community trip feed
