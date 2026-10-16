# Your Render URL: `scopelock-m4bp.onrender.com`

You have **one** service named **`scopelock`** (Blueprint, `srv-db9451u7bikc73dklqsg`). That is correct.

Render’s default hostname is **not** always `https://scopelock.onrender.com`. If that slug is already taken **platform-wide**, Render assigns a suffix, e.g.:

**https://scopelock-m4bp.onrender.com**

You **cannot** force `scopelock.onrender.com` without Render support freeing that global name. Renaming the service will not change this.

## What to use for the hackathon

| Purpose | URL |
|--------|-----|
| Render default (works now) | **https://scopelock-m4bp.onrender.com** |
| Pretty demo / `.tech` prize | **https://scopelock.smriad.tech** (custom domain) |

## Custom domain setup

1. Render → **scopelock** → **Settings** → **Custom Domains** → Add **`scopelock.smriad.tech`**.
2. Render shows a CNAME target (often `scopelock-m4bp.onrender.com`).
3. At your DNS host for **smriad.tech**:

   | Type | Name | Value |
   |------|------|--------|
   | CNAME | scopelock | `scopelock-m4bp.onrender.com` |

4. Wait for **Verified** + TLS (minutes to an hour).
5. Keep `NEXT_PUBLIC_APP_URL=https://scopelock.smriad.tech` in env (already in `render.yaml` / `sync:render`).

## Smoke test

```bash
curl https://scopelock-m4bp.onrender.com/api/health
curl https://scopelock.smriad.tech/api/health   # after DNS
```
