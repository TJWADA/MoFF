# MoFF — Mixture of Finfluencers

Web app for finding YouTube finance channels and seeing how the upside stock ideas in their videos did versus SPY.

The one-shot MVP lives on `archive/one-shot-mvp`. This branch rebuilds the product as a linear flow.

## What it does now

1. Search by name, `@handle`, or channel URL.
2. Pick a channel and browse uploads; keep loading older videos.
3. Open a video, transcribe it, and extract upside share ideas (no shorts, no options).
4. Check the whole video or a single name; every result is mark-to-market from the first session after publish through today versus SPY. A spoken hold period is a chart marker, not an exit.

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
