/**
 * Regenerates everything under fixtures/. Run manually, not part of the
 * pipeline: `pnpm tsx scripts/build-fixtures.ts`
 *
 * Price bars are real daily OHLC captured once from Yahoo Finance and committed
 * as JSON, so the app has no runtime dependency on them -- the live path reads
 * Alpaca. Channels and transcripts are deliberately fictional: attributing
 * invented quotes to real, named people is not something a demo dataset should
 * do. Real channel ids for live mode live in config/channels.json instead.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(import.meta.dirname, "../fixtures");
const TODAY = new Date("2026-08-28T00:00:00Z");
const BENCHMARK = "SPY";

const SYMBOLS = [
  "SPY",
  "NVDA",
  "TSLA",
  "AAPL",
  "MSFT",
  "AMD",
  "PLTR",
  "COIN",
  "META",
  "INTC",
  "GOOGL",
  "AMZN",
];

type Persona = {
  id: string;
  handle: string;
  name: string;
  blurb: string;
  /** Probability a resolved call lands on the correct side. */
  skill: number;
  videoCount: number;
  favourites: string[];
};

const PERSONAS: Persona[] = [
  {
    id: "UC0000000000000000000001",
    handle: "@tickertantrum",
    name: "Ticker Tantrum",
    blurb: "Daily market reactions, heavy on megacap tech.",
    skill: 0.66,
    videoCount: 9,
    favourites: ["NVDA", "MSFT", "GOOGL", "AAPL"],
  },
  {
    id: "UC0000000000000000000002",
    handle: "@thecompoundcurve",
    name: "The Compound Curve",
    blurb: "Slow, boring, valuation-first analysis.",
    skill: 0.63,
    videoCount: 8,
    favourites: ["AAPL", "MSFT", "AMZN", "META"],
  },
  {
    id: "UC0000000000000000000003",
    handle: "@moonshotmondays",
    name: "Moonshot Mondays",
    blurb: "High conviction, high volatility, low survival rate.",
    skill: 0.36,
    videoCount: 9,
    favourites: ["PLTR", "COIN", "TSLA", "AMD"],
  },
  {
    id: "UC0000000000000000000004",
    handle: "@basiscase",
    name: "Basis Case",
    blurb: "Macro framing with occasional single-name calls.",
    skill: 0.52,
    videoCount: 7,
    favourites: ["SPY", "META", "INTC", "NVDA"],
  },
  {
    id: "UC0000000000000000000005",
    handle: "@chartsandvibes",
    name: "Charts & Vibes",
    blurb: "Technical setups, drawn live, mixed results.",
    skill: 0.48,
    videoCount: 8,
    favourites: ["TSLA", "AMD", "COIN", "NVDA"],
  },
  {
    id: "UC0000000000000000000006",
    handle: "@therealalphadesk",
    name: "The Real Alpha Desk",
    blurb: "Confident, loud, frequently wrong.",
    skill: 0.34,
    videoCount: 8,
    favourites: ["INTC", "PLTR", "TSLA", "COIN"],
  },
];

// Deterministic PRNG so regenerating fixtures produces identical output.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260828);

const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const iso = (d: Date) => d.toISOString().slice(0, 10);

type BarRow = { date: string; open: number; close: number };

async function fetchBars(symbol: string): Promise<BarRow[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?interval=1d&range=3y`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart: {
      result: [
        {
          timestamp: number[];
          indicators: {
            quote: [{ open: (number | null)[]; close: (number | null)[] }];
          };
        },
      ];
    };
  };
  const r = json.chart.result[0];
  const q = r.indicators.quote[0];
  const rows: BarRow[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const open = q.open[i];
    const close = q.close[i];
    if (open == null || close == null) continue;
    rows.push({
      date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      open: Math.round(open * 100) / 100,
      close: Math.round(close * 100) / 100,
    });
  }
  return rows;
}

/** First session on or after `date`. */
function sessionOnOrAfter(rows: BarRow[], date: string): BarRow | undefined {
  return rows.find((r) => r.date >= date);
}

function main() {
  return (async () => {
    console.log("fetching real daily bars from Yahoo...");
    const bars: Record<string, BarRow[]> = {};
    for (const s of SYMBOLS) {
      bars[s] = await fetchBars(s);
      console.log(`  ${s}: ${bars[s].length} sessions`);
      await new Promise((r) => setTimeout(r, 150));
    }

    const spy = bars[BENCHMARK];

    /** Real excess return vs SPY, or undefined if the window is incomplete. */
    function excessOf(
      symbol: string,
      startDate: string,
      horizonDays: number,
    ): number | undefined {
      const exitTarget = new Date(startDate);
      exitTarget.setUTCDate(exitTarget.getUTCDate() + horizonDays);
      if (exitTarget > TODAY) return undefined;
      const entry = sessionOnOrAfter(bars[symbol], startDate);
      const exit = sessionOnOrAfter(bars[symbol], iso(exitTarget));
      const bEntry = sessionOnOrAfter(spy, startDate);
      const bExit = sessionOnOrAfter(spy, iso(exitTarget));
      if (!entry || !exit || !bEntry || !bExit) return undefined;
      return exit.close / entry.open - 1 - (bExit.close / bEntry.open - 1);
    }

    const channels = PERSONAS.map((p) => ({
      id: p.id,
      handle: p.handle,
      name: p.name,
      blurb: p.blurb,
      avatarUrl: null,
    }));

    const videos: {
      id: string;
      channelId: string;
      title: string;
      publishedAt: string;
      isShort: boolean;
    }[] = [];
    const transcripts: Record<string, { text: string; provider: string }> = {};
    const callsByVideo: Record<
      string,
      {
        symbol: string;
        direction: "long" | "short";
        conviction: number;
        horizonDays: number;
        rationale: string;
        quote: string;
        quoteStartSeconds: number;
      }[]
    > = {};

    const LONG_PHRASES = [
      "I am adding here, this is the entry I have been waiting for",
      "this one is going a lot higher over the next couple of months",
      "the setup is clean and I am sizing up into it",
      "accumulating on any weakness, the thesis has not changed",
    ];
    const SHORT_PHRASES = [
      "I am trimming everything here, the risk is to the downside",
      "this rolls over from here, I would not touch it",
      "fading this move, the fundamentals do not support it",
      "taking profits and stepping aside on this name",
    ];

    let videoSeq = 0;
    for (const p of PERSONAS) {
      for (let v = 0; v < p.videoCount; v++) {
        // Spread videos over the last ~14 months.
        const daysAgo = Math.floor(20 + rand() * 400);
        const published = new Date(TODAY);
        published.setUTCDate(published.getUTCDate() - daysAgo);
        const pubDate = iso(published);

        const vid = `vid${String(++videoSeq).padStart(5, "0")}`;
        const nCalls = 1 + Math.floor(rand() * 2);
        const used = new Set<string>();
        const calls: (typeof callsByVideo)[string] = [];

        for (let c = 0; c < nCalls; c++) {
          const symbol =
            rand() < 0.7 ? pick(p.favourites) : pick(SYMBOLS.slice(1));
          if (used.has(symbol)) continue;
          used.add(symbol);

          const horizonDays = pick([30, 60, 90]);
          const truth = excessOf(symbol, pubDate, horizonDays);

          let direction: "long" | "short";
          if (truth === undefined) {
            // Still-open call: no future to lean on, so bias by persona mood.
            direction = rand() < 0.68 ? "long" : "short";
          } else {
            const correct = truth > 0 ? "long" : "short";
            const wrong = correct === "long" ? "short" : "long";
            direction = rand() < p.skill ? correct : wrong;
          }

          const conviction = Math.round((0.35 + rand() * 0.6) * 100) / 100;
          const phrase =
            direction === "long" ? pick(LONG_PHRASES) : pick(SHORT_PHRASES);
          const quote = `On ${symbol} -- ${phrase}.`;

          calls.push({
            symbol,
            direction,
            conviction: Math.min(conviction, 0.95),
            horizonDays,
            rationale:
              direction === "long"
                ? `${p.name} argues ${symbol} is mispriced to the upside over the next ${horizonDays} days.`
                : `${p.name} expects ${symbol} to underperform over the next ${horizonDays} days.`,
            quote,
            quoteStartSeconds: 60 + Math.floor(rand() * 900),
          });
        }

        if (calls.length === 0) continue;

        const headline = calls[0];
        videos.push({
          id: vid,
          channelId: p.id,
          title: `${headline.symbol}: ${
            headline.direction === "long" ? "why I am buying" : "why I am out"
          } (${pubDate})`,
          publishedAt: `${pubDate}T14:30:00.000Z`,
          isShort: false,
        });

        transcripts[vid] = {
          provider: "fixture",
          text: [
            `Welcome back to ${p.name}. ${p.blurb}`,
            ...calls.map(
              (c) =>
                `[${Math.floor(c.quoteStartSeconds / 60)}:${String(
                  c.quoteStartSeconds % 60,
                ).padStart(2, "0")}] ${c.quote} ${c.rationale}`,
            ),
            "As always, none of this is financial advice. Like and subscribe.",
          ].join("\n\n"),
        };
        callsByVideo[vid] = calls;
      }
    }

    videos.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

    mkdirSync(OUT, { recursive: true });
    const write = (name: string, data: unknown) =>
      writeFileSync(
        resolve(OUT, name),
        `${JSON.stringify(data, null, 2)}\n`,
        "utf8",
      );

    write("channels.json", channels);
    write("videos.json", videos);
    write("transcripts.json", transcripts);
    write("calls.json", callsByVideo);
    write("bars.json", bars);

    const totalCalls = Object.values(callsByVideo).reduce(
      (n, c) => n + c.length,
      0,
    );
    console.log(
      `wrote ${channels.length} channels, ${videos.length} videos, ` +
        `${totalCalls} calls, ${SYMBOLS.length} symbols`,
    );
  })();
}

await main();
