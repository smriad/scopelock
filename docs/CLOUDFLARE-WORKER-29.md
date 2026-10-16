# `scopelock.smriad.tech` via Cloudflare Worker (like `29`)

Manual **CNAME** records were not publishing on Cloudflare for the `scopelock` label.  
**Worker + custom domain** matches how **`29.smriad.tech`** and **`smriad.tech`** work (DNS type **Worker**, **Proxied**).

## 1. Delete **all** `scopelock` DNS rows (required)

In **DNS** → remove every record whose name is `scopelock` (CNAME, TXT, A, etc.).

Wrangler will fail with **code 100117** (“externally managed DNS records”) until those rows are gone.  
That error also explains why `dig` was empty while the dashboard still showed a CNAME — stale/conflicting records blocked both public resolution and Worker custom domains.

## 2. Create the Worker (dashboard — same flow as `29`)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**.
2. **Create Worker** → name it **`scopelock`** (or any name; `29` uses script name `29`).
3. Replace the default code with `cloudflare-worker/src/index.js` from this repo.
4. **Deploy**.

## 3. Match `29` in the dashboard (no extra zone route)

Under **Domains & Routes** you want **only** a **Production** row for `scopelock.smriad.tech` (same as `29.smriad.tech`).

If you also see **`scopelock.smriad.tech/*`** as type **Route** (leftover from an early `wrangler` deploy with `zone_name`), **delete that route**. Keep the **Production** custom domain only.

`*.workers.dev` URLs are optional; `29` does not need them for the public site.

## 4. Attach the hostname (like `29.smriad.tech`)

1. Worker **`scopelock`** → **Settings** → **Domains & Routes** (or **Triggers** → **Custom Domains**).
2. **Add** → **Custom domain** → **`scopelock.smriad.tech`**.
3. **Add the DNS row by hand** (Wrangler can show “custom domain” while DNS stays empty — `29` has an explicit **Worker** record; `scopelock` often does not).

   **DNS** → **Add record** → type **Worker** (or **Workers** → connect route):

   | Name        | Type   | Worker service | Proxy    |
   |-------------|--------|----------------|----------|
   | `scopelock` | Worker | `scopelock`    | Proxied  |

   You should see **3** rows like `29` (apex + `29` + `scopelock`). If you only see two, this step was skipped.

## 5. Verify

```bash
dig @ed.ns.cloudflare.com scopelock.smriad.tech A +short
# Cloudflare anycast IPs (104.x / 172.x), not empty

curl -s https://scopelock.smriad.tech/api/health
```

Render **Custom Domains** can keep `scopelock.smriad.tech` for their dashboard, or you can rely on the Worker → `scopelock-m4bp.onrender.com` hop only. Traffic hits Cloudflare first; origin TLS uses the `onrender.com` hostname inside the Worker.

## 6. Optional: deploy with Wrangler

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

Set `CLOUDFLARE_ACCOUNT_ID` if prompted (same account as zone `smriad.tech`).

## Env on Render

Keep `NEXT_PUBLIC_APP_URL=https://scopelock.smriad.tech` so links in the UI match the public URL.
