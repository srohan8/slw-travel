# slwtravel.com — Overland Trip Planner

## File structure

```
slwtravel/
  index.html          ← Landing page
  auth.html           ← Sign in / sign up (Supabase auth)
  app/index.html      ← Main app (plan, record, flights, admin)
  proxy/
    server.js         ← Node.js proxy for Railway
    package.json
```

> Auth, storage, and affiliate-link logic all live inline in `app/index.html` and
> `auth.html` — there are no separate JS modules for them.

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

### 2. Admin access

Admin access is gated by Supabase auth + a `profiles.is_admin` flag — no shared password in the HTML. To grant admin access to an existing user, run in the Supabase SQL editor:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Then sign in at `/app.html` with that account — an **Admin** tab appears in the navbar. The legacy `/admin.html` URL redirects there. The Admin tab has three sub-tabs: Booking sites, Platform (maintenance/signups/limits), and Advisory refresh (FCDO/Canada API templates + refresh status).

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

---

## License

[PolyForm Noncommercial 1.0.0](LICENSE) — source visible for personal/educational/
noncommercial use; commercial use requires a separate agreement with the copyright
holder.
