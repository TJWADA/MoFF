# MoFF — Mixture of Finfluencers

Tracks how YouTube finance influencers' calls actually performed, and shows
where they currently agree or disagree.

The pipeline pulls new videos from tracked channels, fetches their transcripts,
uses an LLM to extract structured trade calls, then scores each call against
SPY over the same window. Nothing is anyone's financial advice, and no trades
are placed on anyone's behalf.

## Running it

The app ships with checked-in fixtures, so it runs with **no API keys**:

```bash
pnpm install
pnpm db:migrate && pnpm db:seed   # create the schema, seed the channel watchlist
pnpm pipeline                     # discover -> transcribe -> extract -> prices -> score
pnpm dev                          # http://localhost:3000
```

`pnpm db:reset` wipes the local database and starts over.

Other commands:

```bash
pnpm test        # unit tests for the scoring and consensus math
pnpm typecheck
pnpm build
pnpm pipeline extract      # run a single stage
pnpm broker --dry-run      # see what the consensus fund would trade
```

## Going live

Copy `.env.example` to `.env.local`, set `MOFF_MODE=live`, and add whichever
keys you have. Each stage independently falls back to fixtures when its own key
is missing, so you can switch providers on one at a time:

| Key | Enables | Cost |
| --- | --- | --- |
| `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` | Real prices, real scoring, paper trading | Free tier is enough |
| `OPENAI_API_KEY` | Real call extraction | Cents per day |
| `SUPADATA_API_KEY` | Real transcripts | ~$17/mo for 3,000 |

Video discovery needs no key at all — it uses YouTube's RSS feeds. Set
`MOFF_MODE=live` with no other keys and the app will poll the real channels in
`config/channels.json`.

## How it works

```
discover  RSS feed per channel, quota-free, no API key
transcribe  Supadata (transcripts are immutable, so fetched once and cached)
extract   LLM with a Zod-validated schema, one row per distinct thesis
prices    Alpaca daily bars, adjustment=all, cached in the bars table
score     resolve each call against SPY once its horizon has elapsed
```

Every stage is idempotent and skips work already done, so re-running is cheap.
In production it is one cron entry.

### Two constraints that shaped the design

**Per-influencer broker accounts are not possible.** Alpaca caps you at three
paper accounts per login and offers no API to create them. Performance is
therefore computed from price history rather than from broker accounts, which
is also more accurate: Alpaca's paper engine does not simulate dividends at
all, while `adjustment=all` bars have them baked in. A single real paper
account optionally trades the consensus picks (`pnpm broker`).

**Transcript scraping is largely broken from datacenter IPs.** YouTube now
gates subtitle requests behind PO Tokens. Measured from a cloud VM in August
2026: `yt-dlp` failed outright, `youtubei.js` failed 4/4, and
`youtube-transcript-api` succeeded 2/8. Discovery over RSS is unaffected, so
the app self-hosts discovery and buys transcripts.

### The math

Deliberately small: scoring is a subtraction, consensus is a count.

**Scoring a call.** Entry is the open of the first session *strictly after*
publication — a video published mid-session cannot be filled at that session's
open, and using the publish-day close would be look-ahead bias. Exit is the
close at the stated horizon.

```
excess = (exit/entry - 1) - (spy_exit/spy_entry - 1)
```

The stored figure is direction-adjusted, so it is what a follower actually
earned: a short profits when the name underperforms. Averaging the raw figure
across a mix of longs and shorts would be meaningless, since a badly wrong
short on a name that doubled would count as a large positive.

Excess return rather than raw return is the headline everywhere, because in a
rising market raw return flatters everyone.

**Influencer stats.** Average excess return, hit rate, and sample size — always
shown together. A channel needs 5 resolved calls before it is ranked.

**Consensus.** One vote per channel per ticker, counting only calls still
inside their horizon:

```
score = (bulls - bears) / (bulls + bears)     // -1 to +1
```

*Corroborated* means 3+ channels and `|score| >= 0.6`. *Contested* means at
least 2 channels on each side. Weighting votes by track record would turn this
into a real mixture-of-experts and is the obvious next step, but it needs a
body of resolved calls to exist first.

## Fixtures

`fixtures/` holds real 3-year daily OHLC captured once from Yahoo Finance,
paired with six **fictional** influencer personas. The personas are invented on
purpose: attributing fabricated quotes to real, named people is not something a
demo dataset should do. Real channel ids for live polling are in
`config/channels.json`.

Regenerate with `pnpm tsx scripts/build-fixtures.ts`.

## Layout

```
app/            pages and components
lib/            schema, providers, and the scoring/consensus math
lib/*.test.ts   unit tests
scripts/        migrate, seed, pipeline, broker, fixture builder
fixtures/       committed demo data
config/         real channel watchlist for live mode
```

Database is SQLite via Drizzle's libSQL driver: a local file in development, a
Turso URL in production. Same dialect either way, nothing to install.
