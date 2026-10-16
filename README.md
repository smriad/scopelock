# ScopeLock

**Local-first AI that turns freelance scope creep into paid change orders.**

Built for [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).

## Production (Render + smriad.tech)

See **[docs/RENDER-SMRIAD.md](docs/RENDER-SMRIAD.md)**.

1. Deploy with `render.yaml` → service `scopelock`
2. DNS: **CNAME** `scopelock` → `*.onrender.com`
3. `export RENDER_API_KEY=rnd_... && npm run sync:render` (reads `.env.local`)

Live URL: **https://scopelock.smriad.tech**

## Local dev

```bash
cp .env.example .env.local   # fill partner keys
npm install
npm run dev
```

Optional: `docker compose up -d` for local pgvector; local Ollama for embeddings.

Open http://localhost:3000 — samples preloaded.

## How it works

1. Paste your **statement of work** and optionally **Index into pgvector** (embeds chunks with Ollama + stores in Postgres).
2. Paste a **client thread**.
3. **Analyze scope** — Ollama returns structured JSON: verdicts, SOW citations, reply draft, change-order line items.

If Ollama is offline, the app uses a **demo analysis** so you can still record a video (set `DEMO_MODE=true` on cloud hosts).

## Stack

| Layer | Tech |
|--------|------|
| UI | Next.js, Tailwind |
| Inference | [Ollama](https://ollama.com) — Gemma / Llama (open weights) |
| RAG | PostgreSQL + pgvector (compatible with [Tiger Data](https://www.tigerdata.com)) |
| Deploy | Render (`render.yaml`, demo mode) |

## Environment

See `.env.example`.

## License

MIT
