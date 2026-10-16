# Deploy ScopeLock on Render → `scopelock.smriad.tech`

## 1. Create the Render service

- Connect this repo in Render, or use **Blueprint** with `render.yaml`.
- Service name: `scopelock` (matches `scripts/sync-render-env.ts`).

## 2. DNS on smriad.tech

In your domain registrar / DNS host:

| Type  | Name       | Value                          |
|-------|------------|--------------------------------|
| CNAME | scopelock  | `<your-service>.onrender.com`  |

Render → **Settings → Custom Domains** → add `scopelock.smriad.tech` and verify.

## 3. Environment variables

Copy `.env.example` to `.env.local`, fill from Hacktoberfest partner promos, then:

```bash
export RENDER_API_KEY=rnd_...
npx tsx scripts/sync-render-env.ts
```

Required for full partner stack:

- `OLLAMA_*` → OpenRouter + **Gemma 3** (`google/gemma-3-4b-it`)
- `TIGER_DATABASE_URL` → Tiger Data / Timescale (pgvector). Copy the **working** URI from your Tiger console (an old stillbench URL may fail auth).
- `MONGODB_URI` + `MONGODB_DB=scopelock`
- `PRIORLABS_API_KEY` → TabPFN hour regression
- `SENTRY_DSN`, `ELEVENLABS_*`, `SERPAPI_API_KEY`, `BACKBOARD_*`, `TINKER_*`
- `NEXT_PUBLIC_APP_URL=https://scopelock.smriad.tech`
- `DEMO_MODE=false`

## 4. Smoke test

```bash
curl https://scopelock.smriad.tech/api/health
curl https://scopelock.smriad.tech/api/integrations
```

Open the app, load samples, **Index SOW** (Tiger or Mongo), **Analyze scope**, **Listen** (ElevenLabs).
