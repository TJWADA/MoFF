"use server";

import type { CallResult, ChartPoint } from "@/lib/backtest";
import { evaluateCalls } from "@/lib/evaluate";
import { ExtractedCall } from "@/lib/extract";
import { z } from "zod";

export type BacktestState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      mode: "video" | "trade";
      results: CallResult[];
      series: ChartPoint[];
      focusKey?: string;
    };

const CallSchema = z.object({
  symbol: z.string(),
  companyName: z.string().optional().default(""),
  direction: z.enum(["long", "short"]).optional().default("long"),
  horizonDays: z.number().int().min(1).max(730).nullable().optional().default(null),
  rationale: z.string(),
  quote: z.string(),
  quoteStartSeconds: z.number().int().min(0).nullable(),
});

export async function runBacktest(
  _prev: BacktestState,
  formData: FormData,
): Promise<BacktestState> {
  const modeRaw = String(formData.get("mode") ?? "").trim();
  const mode = modeRaw === "trade" ? "trade" : "video";
  const publishedAt = String(formData.get("publishedAt") ?? "").trim();
  const callsJson = String(formData.get("calls") ?? "").trim();
  const focusKey = String(formData.get("focusKey") ?? "").trim() || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    return { status: "error", message: "Missing or invalid video publish date." };
  }

  let calls: ExtractedCall[];
  try {
    const parsed = z.array(CallSchema).parse(JSON.parse(callsJson));
    calls = parsed;
  } catch {
    return { status: "error", message: "Could not read extracted calls." };
  }

  if (calls.length === 0) {
    return { status: "error", message: "No calls to check." };
  }

  try {
    const { results, series } = await evaluateCalls(
      calls,
      publishedAt,
      mode,
    );
    return { status: "done", mode, results, series, focusKey };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Couldn’t check how these trades did.",
    };
  }
}
