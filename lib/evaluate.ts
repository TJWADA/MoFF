import {
  backtestCalls,
  barsWindow,
  BENCHMARK,
  type ChartPoint,
  type CallResult,
} from "./backtest";
import type { ExtractedCall } from "./extract";
import { fetchBars } from "./prices";
import { correctUnpricedCalls } from "./tickers";

export async function evaluateCalls(
  calls: ExtractedCall[],
  publishedAt: string,
  mode: "video" | "trade",
): Promise<{ results: CallResult[]; series: ChartPoint[]; calls: ExtractedCall[] }> {
  const priced = await correctUnpricedCalls(calls);
  const { start, end } = barsWindow(publishedAt, priced);
  const symbols = [...new Set(priced.map((c) => c.symbol)), BENCHMARK];
  const bars = await fetchBars(symbols, start, end);
  const { results, series } = backtestCalls(priced, publishedAt, bars, mode);
  return { results, series, calls: priced };
}
