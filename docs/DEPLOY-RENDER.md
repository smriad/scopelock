# Deploy ScopeLock on Render (step-by-step)

## Prerequisites

- GitHub repo: **https://github.com/smriad/scopelock**
- Local `.env.local` with partner keys (same as stillbench)
- Render account (same one as stillbench is fine)

---

## Step 1 — Push code (already done if you cloned from GitHub)

```bash
cd scopelock
git push origin main
```

---

## Step 2 — Create the service from Blueprint

1. Open **[Render Blueprints](https://dashboard.render.com/blueprints)**.
2. **New Blueprint Instance**.
3. Connect **GitHub** → select **`smriad/scopelock`**.
4. Render reads **`render.yaml`** at the repo root → service name **`scopelock`**.
5. Click **Apply** and wait for the first deploy (build ~3–5 min).

If Blueprint is unavailable: **New → Web Service** → connect repo →  
**Build:** `npm ci && npm run build` · **Start:** `npm start` · **Health check:** `/api/health`

---

## Step 3 — Add secrets (do not commit these)

1. Get an API key: [Render → Account Settings → API Keys](https://dashboard.render.com/u/settings#api-keys).
2. From your machine:

```bash
cd scopelock
export RENDER_API_KEY=rnd_xxxxxxxx
npm run sync:render
```

This copies every key from **`.env.local`** onto the Render service (OpenRouter, Tiger, MongoDB, TabPFN, etc.).

**Or** paste the same keys manually in Render → **scopelock** → **Environment**.

---

## Step 4 — Custom domain `scopelock.smriad.tech`

1. Render → **scopelock** → **Settings** → **Custom Domains** → add `scopelock.smriad.tech`.
2. At your DNS host for **smriad.tech**, add:

| Type  | Name      | Target                    |
|-------|-----------|---------------------------|
| CNAME | scopelock | `scopelock.onrender.com`  |

(Use the exact hostname Render shows after you add the domain.)

3. Wait for TLS (usually a few minutes).

Ensure `NEXT_PUBLIC_APP_URL=https://scopelock.smriad.tech` is set (in `render.yaml` + sync).

---

## Step 5 — Verify

```bash
curl https://scopelock.onrender.com/api/health
# or after DNS:
curl https://scopelock.smriad.tech/api/health
curl https://scopelock.smriad.tech/api/integrations
```

Open the site → **Index SOW** → **Analyze scope**. Tiger + Mongo should show green on `/api/integrations`.

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| Build fails on `npm ci` | Run `npm ci` locally; commit `package-lock.json` |
| `database: false` on Render | Set working `TIGER_DATABASE_URL` (house-pot URI, not expired stillbench) |
| Gemma offline | Set `OLLAMA_BASE_URL` + `OLLAMA_API_KEY` (OpenRouter) |
| Free plan sleeps | Upgrade to **starter** in `render.yaml` or wake URL before demo |

---

## Redeploy after changes

Push to `main` (auto-deploy if enabled) or **Manual Deploy** in Render dashboard.
