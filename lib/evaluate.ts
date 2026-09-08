import {
  backtestCalls,
  barsWindow,
  BENCHMARK,
  type ChartPoint,
  type CallResult,
  type RawPricePoint,
} from "./backtest";
import type { ExtractedCall } from "./extract";
import { fetchBars } from "./prices";
import { correctUnpricedCalls } from "./tickers";

export async function evaluateCalls(
  calls: ExtractedCall[],
  publishedAt: string,
  mode: "video" | "trade",
): Promise<{
  results: CallResult[];
  series: ChartPoint[];
  prices?: RawPricePoint[];
  calls: ExtractedCall[];
}> {
  const priced = await correctUnpricedCalls(calls);
  const { start, end } = barsWindow(publishedAt, priced, mode);
  const symbols = [...new Set(priced.map((c) => c.symbol)), BENCHMARK];
  const bars = await fetchBars(symbols, start, end);
  const { results, series, prices } = backtestCalls(
    priced,
    publishedAt,
    bars,
    mode,
  );
  return { results, series, prices, calls: priced };
}
