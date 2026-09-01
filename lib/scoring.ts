/**
 * All performance numbers in MoFF come from these functions. They are pure and
 * take sessions as plain arrays so they can be unit tested without a database.
 */

export const BENCHMARK = "SPY";

/** Channels below this many resolved calls are not ranked on the leaderboard. */
export const MIN_RESOLVED_CALLS = 5;

export type Session = { date: string; open: number; close: number };

export type Direction = "long" | "short";

export type Outcome = {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  /** Direction-adjusted: what a follower earned against SPY. */
  excessReturn: number;
  hit: boolean;
};

/** YYYY-MM-DD plus n days, still YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function toDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** First session on or after `date`. Sessions must be sorted ascending. */
export function sessionOnOrAfter(
  sessions: Session[],
  date: string,
): Session | undefined {
  return sessions.find((s) => s.date >= date);
}

/** First session strictly after `date`. */
export function sessionAfter(
  sessions: Session[],
  date: string,
): Session | undefined {
  return sessions.find((s) => s.date > date);
}

/**
 * How much the name itself beat the benchmark over the window, ignoring which
 * way the call was made.
 *
 * Raw return would flatter everyone in a rising market, which is exactly the
 * illusion this site exists to puncture, so everything is measured against SPY.
 */
export function excessReturn(
  entryPrice: number,
  exitPrice: number,
  benchEntryPrice: number,
  benchExitPrice: number,
): number {
  const asset = exitPrice / entryPrice - 1;
  const bench = benchExitPrice / benchEntryPrice - 1;
  return asset - bench;
}

/**
 * What someone following the call actually earned against the benchmark. A
 * short profits when the name underperforms, so the sign flips.
 *
 * This, not the raw figure, is what gets stored and averaged. Averaging raw
 * excess across a mix of longs and shorts is meaningless: a badly wrong short
 * on a name that doubled would count as a large positive.
 */
export function callExcessReturn(
  direction: Direction,
  rawExcess: number,
): number {
  return direction === "long" ? rawExcess : -rawExcess;
}

export function isHit(direction: Direction, rawExcess: number): boolean {
  return callExcessReturn(direction, rawExcess) > 0;
}

/**
 * Resolve one call against price history, or return undefined if the window is
 * not complete yet (the call is still open) or bars are missing.
 *
 * Entry is the open of the first session strictly after the publish date. A
 * video published mid-session cannot be acted on at that session's open, and
 * using the publish day's close would be look-ahead bias, so the next open is
 * the earliest honest fill.
 */
export function resolveCall(
  call: { publishedOn: string; direction: Direction; horizonDays: number },
  sessions: Session[],
  benchmark: Session[],
): Outcome | undefined {
  const entry = sessionAfter(sessions, call.publishedOn);
  if (!entry) return undefined;

  const exit = sessionOnOrAfter(
    sessions,
    addDays(call.publishedOn, call.horizonDays),
  );
  if (!exit || exit.date <= entry.date) return undefined;

  const benchEntry = sessionOnOrAfter(benchmark, entry.date);
  const benchExit = sessionOnOrAfter(benchmark, exit.date);
  if (!benchEntry || !benchExit) return undefined;

  const raw = excessReturn(
    entry.open,
    exit.close,
    benchEntry.open,
    benchExit.close,
  );
  const excess = callExcessReturn(call.direction, raw);

  return {
    entryDate: entry.date,
    entryPrice: entry.open,
    exitDate: exit.date,
    exitPrice: exit.close,
    excessReturn: excess,
    hit: excess > 0,
  };
}

export type ChannelStats = {
  resolved: number;
  hits: number;
  hitRate: number;
  avgExcessReturn: number;
  ranked: boolean;
};

export function summarise(
  outcomes: { excessReturn: number; hit: boolean }[],
): ChannelStats {
  const resolved = outcomes.length;
  if (resolved === 0) {
    return { resolved: 0, hits: 0, hitRate: 0, avgExcessReturn: 0, ranked: false };
  }
  const hits = outcomes.filter((o) => o.hit).length;
  const total = outcomes.reduce((sum, o) => sum + o.excessReturn, 0);
  return {
    resolved,
    hits,
    hitRate: hits / resolved,
    avgExcessReturn: total / resolved,
    ranked: resolved >= MIN_RESOLVED_CALLS,
  };
}
