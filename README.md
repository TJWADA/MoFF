# MoFF — Mixture of Finfluencers

Web app for finding YouTube finance channels and seeing how the trade calls in their videos did versus SPY.

The one-shot MVP lives on `archive/one-shot-mvp`. This branch rebuilds the product as a linear flow.

## What it does now

1. Search by name, `@handle`, or channel URL.
2. Pick a channel and browse recent videos (with “view more”).
3. Open a video, transcribe it, and extract actionable long/short calls.
4. Check the whole video’s recommendations or a single trade; completed horizons show final results, open ones show mark-to-market so far, both charted vs SPY.

YouTube discovery needs no API key. Transcripts need `SUPADATA_API_KEY`, extraction needs `OPENAI_API_KEY`, and checking results needs `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` (see `.env.example`).

Nothing is stored yet — results are computed on demand.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
```

## Disclaimer

MoFF is a research project. Nothing here is financial advice, and no trades are placed on anyone’s behalf.
