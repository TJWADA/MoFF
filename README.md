# MoFF — Mixture of Finfluencers

Rebuild in progress. The one-shot MVP is on the `archive/one-shot-mvp` branch.

Right now the app is only the first pipeline hop: **find a YouTuber and list their videos**.

## What this slice does

1. You type a name, `@handle`, or channel URL.
2. A handle or URL is resolved from the public channel page. A name is searched through YouTube's public web client (no Google Cloud API key).
3. Opening a channel loads its Videos tab through that same client. Click a row to watch it.

Nothing is stored. Transcripts, call extraction, and scoring are not in this slice.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
```

No `.env` keys are required.
