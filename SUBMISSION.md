*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

## What I Built

**ScopeLock** — a freelance side-hustle tool that turns scope creep into paid change orders.

Live at **https://scopelock.smriad.tech** (Render + `smriad.tech` subdomain).

Paste a client thread and SOW (or **import Slack JSON** / a **client voice memo**). The agent labels each ask, cites contract language, drafts a boundary email, and shows a **Side hustle cockpit**: scope-creep score, **TabPFN “get-paid” odds**, rush-fee math, and a **client-ready change order** export (.md).

## Demo

- **App:** https://scopelock.smriad.tech
- Load samples → **Index SOW** → **Analyze scope** → **Listen** (ElevenLabs)

## Code

GitHub: *(add repo URL)*

## How I Built It

| Layer | Partner |
|--------|---------|
| Host | **Render** (`render.yaml`, health checks) |
| LLM | **Gemma 3** via OpenRouter (`google/gemma-3-4b-it`) |
| Orchestration | **Mastra** agent + workflow module |
| RAG | **Tiger Data** pgvector + Postgres FTS; **MongoDB Atlas** fallback |
| Hours | **TabPFN 3.5** regression on `samples/projects_history.csv` |
| Voice | **ElevenLabs** TTS on suggested reply |
| Search | **SerpApi** freelance rate snippets |
| Memory | **Backboard** remembers scope patterns |
| Tone | **Tinker** fine-tuned sampler polishes replies |
| Tracing | **Sentry** spans on analyze path |
| CI | **GitHub Actions** (Copilot-friendly workflow) |

## Why Does Open Innovation Matter?

Freelancers cannot paste client threads into closed APIs. Open **Gemma** weights (via OpenRouter or Ollama) keep inference swappable, TabPFN runs on *your* historical CSV without training a custom model, and Tiger/Mongo keep SOW data under your control.

## My Agent Session

*(DevRelay embed)*

## Prize Categories

**Featured:** Best Use of Render · Gemma · TabPFN · Tinker  

**Partner:** Backboard · ElevenLabs · Entire · GitHub Copilot · Mastra · MongoDB Atlas · Sentry Agent Tracing · SerpApi · Best Use of a .tech Domain · Tiger Data  

*(Not entered: Arduino, DigitalOcean, Temporal — no hardware / second worker in this build.)*
