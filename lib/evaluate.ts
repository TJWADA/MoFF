import {
  backtestCalls,
  barsWindow,
  BENCHMARK,
  type ChartPoint,
  type CallResult,
} from "./backtest";
import type { ExtractedCall } from "./extract";
import { fetchBars } from "./prices";

export async function evaluateCalls(
  calls: ExtractedCall[],
  publishedAt: string,
  mode: "video" | "trade",
): Promise<{ results: CallResult[]; series: ChartPoint[] }> {
  const { start, end } = barsWindow(publishedAt, calls);
  const symbols = [...new Set(calls.map((c) => c.symbol)), BENCHMARK];
  const bars = await fetchBars(symbols, start, end);
  return backtestCalls(calls, publishedAt, bars, mode);
}
