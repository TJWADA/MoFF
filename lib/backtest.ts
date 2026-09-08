import type { ExtractedCall } from "./extract";
import { barsBySymbol, type BarRow } from "./prices";

export const BENCHMARK = "SPY";

export type Session = { date: string; open: number; close: number };

export type CallResult = {
  symbol: string;
  direction: "long" | "short";
  horizonDays: number | null;
  status: "completed" | "open" | "unresolved";
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  exitPrice?: number;
  /** Raw stock move over the window (exit/entry - 1), not direction-adjusted. */
  priceReturn?: number;
  /** SPY move over the same window. */
  spyReturn?: number;
  absoluteReturn?: number;
  excessReturn?: number;
  hit?: boolean;
  message?: string;
};

export type ChartPoint = { date: string; trade: number; spy: number };

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function recommendedHorizonDate(
  entryDate: string | undefined,
  horizonDays: number | null | undefined,
): string | undefined {
  if (!entryDate || horizonDays == null) return undefined;
  return addDays(entryDate, horizonDays);
}

export function sessionOnOrAfter(
  sessions: Session[],
  date: string,
): Session | undefined {
  return sessions.find((s) => s.date >= date);
}

export function sessionAfter(
  sessions: Session[],
  date: string,
): Session | undefined {
  return sessions.find((s) => s.date > date);
}

function absoluteReturn(
  direction: "long" | "short",
  entry: number,
  exit: number,
): number {
  const raw = exit / entry - 1;
  return direction === "long" ? raw : -raw;
}

function directionEquity(
  direction: "long" | "short",
  entry: number,
  price: number,
): number {
  const ratio = price / entry;
  return direction === "long" ? ratio : 2 - ratio;
}

/**
 * Resolve one call. Entry is the first session after publish. Mark-to-market
 * through the latest session (today). Spoken horizonDays is not an exit.
 */
export function resolveCall(
  call: Pick<ExtractedCall, "symbol" | "direction" | "horizonDays">,
  publishedOn: string,
  sessions: Session[],
  benchmark: Session[],
): CallResult {
  const base = {
    symbol: call.symbol,
    direction: call.direction,
    horizonDays: call.horizonDays ?? null,
  };

  const entry = sessionAfter(sessions, publishedOn);
  if (!entry) {
    return {
      ...base,
      status: "unresolved",
      message: `No price data for ${call.symbol} after ${publishedOn}. The ticker may be wrong or not in our US daily feed.`,
    };
  }

  const latest = [...sessions].reverse().find((s) => s.date >= entry.date);
  if (!latest) {
    return {
      ...base,
      status: "unresolved",
      message: "Not enough price history after entry.",
      entryDate: entry.date,
      entryPrice: entry.open,
    };
  }

  const status = "open" as const;
  const exit = latest;

  const benchEntry = sessionOnOrAfter(benchmark, entry.date);
  const benchExit = sessionOnOrAfter(benchmark, exit.date);
  if (!benchEntry || !benchExit) {
    return {
      ...base,
      status: "unresolved",
      message: "Missing SPY bars for the entry/exit window.",
      entryDate: entry.date,
      entryPrice: entry.open,
    };
  }

  const exitPrice = exit.close;
  const priceReturn = exitPrice / entry.open - 1;
  const spyReturn = benchExit.close / benchEntry.open - 1;
  const abs = absoluteReturn(call.direction, entry.open, exitPrice);
  const excess =
    call.direction === "long"
      ? priceReturn - spyReturn
      : spyReturn - priceReturn;

  return {
    ...base,
    status,
    entryDate: entry.date,
    exitDate: exit.date,
    entryPrice: entry.open,
    exitPrice,
    priceReturn,
    spyReturn,
    absoluteReturn: abs,
    excessReturn: excess,
    hit: excess > 0,
  };
}

function sessionsFor(
  bySymbol: Map<string, Session[]>,
  symbol: string,
): Session[] {
  return bySymbol.get(symbol.toUpperCase()) ?? [];
}

/** Point-in-time price on a date: entry day uses open, later days use close. */
function priceOnDate(
  sessions: Session[],
  entryDate: string,
  entryOpen: number,
  date: string,
): number | undefined {
  const s = sessions.find((x) => x.date === date);
  if (!s) return undefined;
  if (date === entryDate) return entryOpen;
  return s.close;
}

export function buildTradeSeries(
  call: Pick<ExtractedCall, "symbol" | "direction">,
  result: CallResult,
  sessions: Session[],
  benchmark: Session[],
): ChartPoint[] {
  if (
    !result.entryDate ||
    !result.exitDate ||
    result.entryPrice == null ||
    result.status === "unresolved"
  ) {
    return [];
  }

  const points: ChartPoint[] = [];
  const benchEntry = sessionOnOrAfter(benchmark, result.entryDate);
  if (!benchEntry) return [];

  for (const s of sessions) {
    if (s.date < result.entryDate || s.date > result.exitDate) continue;
    const price = priceOnDate(
      sessions,
      result.entryDate,
      result.entryPrice,
      s.date,
    );
    if (price == null) continue;
    const bench = sessionOnOrAfter(benchmark, s.date);
    if (!bench) continue;

    const spyPrice =
      s.date === result.entryDate ? benchEntry.open : bench.close;

    points.push({
      date: s.date,
      trade: directionEquity(call.direction, result.entryPrice, price) * 100,
      spy: (spyPrice / benchEntry.open) * 100,
    });
  }

  return points;
}

type ActiveCall = {
  direction: "long" | "short";
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  sessions: Session[];
};

/**
 * Equal-weight book: each resolvable call contributes from its entry; after
 * exit its equity is frozen. Book = average of active (entered) call equities.
 */
export function buildBookSeries(
  actives: ActiveCall[],
  benchmark: Session[],
): ChartPoint[] {
  if (actives.length === 0) return [];

  const start = actives.reduce(
    (min, a) => (a.entryDate < min ? a.entryDate : min),
    actives[0].entryDate,
  );
  const end = actives.reduce(
    (max, a) => (a.exitDate > max ? a.exitDate : max),
    actives[0].exitDate,
  );

  const benchEntry = sessionOnOrAfter(benchmark, start);
  if (!benchEntry) return [];

  const dates = [
    ...new Set(
      benchmark
        .filter((s) => s.date >= start && s.date <= end)
        .map((s) => s.date),
    ),
  ].sort();

  const points: ChartPoint[] = [];
  for (const date of dates) {
    const equities: number[] = [];
    for (const a of actives) {
      if (date < a.entryDate) continue;
      const asOf = date > a.exitDate ? a.exitDate : date;
      const price = priceOnDate(a.sessions, a.entryDate, a.entryPrice, asOf);
      if (price == null) continue;
      equities.push(directionEquity(a.direction, a.entryPrice, price));
    }
    if (equities.length === 0) continue;
    const bench = sessionOnOrAfter(benchmark, date);
    if (!bench) continue;
    const book = equities.reduce((s, e) => s + e, 0) / equities.length;
    const spyPrice = date === start ? benchEntry.open : bench.close;
    points.push({
      date,
      trade: book * 100,
      spy: (spyPrice / benchEntry.open) * 100,
    });
  }

  return points;
}

export function backtestCalls(
  calls: ExtractedCall[],
  publishedOn: string,
  bars: BarRow[],
  mode: "video" | "trade",
): { results: CallResult[]; series: ChartPoint[] } {
  const bySymbol = barsBySymbol(bars);
  const benchmark = sessionsFor(bySymbol, BENCHMARK);

  const results = calls.map((call) =>
    resolveCall(
      call,
      publishedOn,
      sessionsFor(bySymbol, call.symbol),
      benchmark,
    ),
  );

  if (mode === "trade" && calls.length === 1) {
    const call = calls[0];
    const result = results[0];
    return {
      results,
      series: buildTradeSeries(
        call,
        result,
        sessionsFor(bySymbol, call.symbol),
        benchmark,
      ),
    };
  }

  const actives: ActiveCall[] = [];
  for (let i = 0; i < calls.length; i++) {
    const r = results[i];
    if (
      r.status === "unresolved" ||
      !r.entryDate ||
      !r.exitDate ||
      r.entryPrice == null
    ) {
      continue;
    }
    actives.push({
      direction: calls[i].direction,
      entryDate: r.entryDate,
      entryPrice: r.entryPrice,
      exitDate: r.exitDate,
      sessions: sessionsFor(bySymbol, calls[i].symbol),
    });
  }

  return { results, series: buildBookSeries(actives, benchmark) };
}

/** Inclusive date window covering publish through today. */
export function barsWindow(
  publishedOn: string,
  _calls: ExtractedCall[],
): { start: string; end: string } {
  const today = new Date().toISOString().slice(0, 10);
  const start = addDays(publishedOn, -7);
  return { start, end: today < start ? start : today };
}
