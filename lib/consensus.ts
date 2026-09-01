import type { Direction } from "./scoring";

/** One channel's current position on one symbol. */
export type Stance = {
  channelId: string;
  channelName: string;
  channelHandle: string;
  direction: Direction;
  conviction: number;
  videoId: string;
  videoTitle: string;
  publishedAt: number;
  quote: string;
  quoteStartSeconds: number | null;
  horizonDays: number;
};

export type Label = "corroborated" | "contested" | "mixed";

export type SymbolConsensus = {
  symbol: string;
  bulls: number;
  bears: number;
  channels: number;
  /** -1 (unanimously bearish) to +1 (unanimously bullish). */
  score: number;
  label: Label;
  stances: Stance[];
};

/** A call counts as live until its stated horizon has elapsed. */
export function isActive(
  publishedAt: number,
  horizonDays: number,
  now = Date.now(),
): boolean {
  return publishedAt + horizonDays * 86_400_000 >= now;
}

/**
 * One vote per channel. A channel that keeps repeating itself on the same
 * ticker should not outvote three channels that mentioned it once, so only its
 * most recent stance counts.
 */
export function dedupeByChannel(stances: Stance[]): Stance[] {
  const latest = new Map<string, Stance>();
  for (const s of stances) {
    const held = latest.get(s.channelId);
    if (!held || s.publishedAt > held.publishedAt) latest.set(s.channelId, s);
  }
  return [...latest.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * Labels are mutually exclusive and checked in this order:
 *
 * 1. corroborated -- 3+ channels and a clear lean
 * 2. contested    -- at least 2 channels on each side
 * 3. mixed        -- everything else, including thin coverage
 *
 * A score of 0.6 means 80% of channels are on one side, so the two rules only
 * ever collide when the split is very lopsided but still has two dissenters,
 * as in 8 bullish against 2 bearish. Corroborated wins there, because that
 * really is agreement. Anything closer than 4:1 stays contested.
 */
export function classify(
  bulls: number,
  bears: number,
  score: number,
): Label {
  const channels = bulls + bears;
  if (channels >= 3 && Math.abs(score) >= 0.6) return "corroborated";
  if (bulls >= 2 && bears >= 2) return "contested";
  return "mixed";
}

export function consensusFor(
  symbol: string,
  allStances: Stance[],
): SymbolConsensus {
  const stances = dedupeByChannel(allStances);
  const bulls = stances.filter((s) => s.direction === "long").length;
  const bears = stances.length - bulls;
  const score = stances.length === 0 ? 0 : (bulls - bears) / stances.length;

  return {
    symbol,
    bulls,
    bears,
    channels: stances.length,
    score,
    label: classify(bulls, bears, score),
    stances,
  };
}

export function buildConsensus(
  bySymbol: Map<string, Stance[]>,
): SymbolConsensus[] {
  return [...bySymbol.entries()]
    .map(([symbol, stances]) => consensusFor(symbol, stances))
    .sort(
      (a, b) =>
        b.channels - a.channels || Math.abs(b.score) - Math.abs(a.score),
    );
}

/**
 * Net lean across every live call, one vote per channel per symbol. Ranges from
 * -1 (everyone bearish on everything) to +1.
 */
export function marketSentiment(consensus: SymbolConsensus[]): {
  score: number;
  bulls: number;
  bears: number;
} {
  const bulls = consensus.reduce((n, c) => n + c.bulls, 0);
  const bears = consensus.reduce((n, c) => n + c.bears, 0);
  const total = bulls + bears;
  return { score: total === 0 ? 0 : (bulls - bears) / total, bulls, bears };
}
