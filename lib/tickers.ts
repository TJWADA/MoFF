import { z } from "zod";
import { envKey } from "./env";
import type { ExtractedCall } from "./extract";
import { fetchBars } from "./prices";

const SYMBOL_RE = /^[A-Z]{1,5}$/;

const Corrections = z.object({
  corrections: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
    }),
  ),
});

function utcDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function symbolsWithRecentBars(
  symbols: string[],
): Promise<Set<string>> {
  if (symbols.length === 0) return new Set();
  const bars = await fetchBars(symbols, utcDate(-120), utcDate(0));
  return new Set(bars.map((b) => b.symbol.toUpperCase()));
}

/**
 * When a ticker has no US daily bars, ask the model for the official listing
 * using the company name (APS + Digital Turbine → APPS).
 */
export async function correctUnpricedCalls(
  calls: ExtractedCall[],
): Promise<ExtractedCall[]> {
  const unique = [...new Set(calls.map((c) => c.symbol.toUpperCase()))];
  if (unique.length === 0 || !envKey("ALPACA_API_KEY_ID")) return calls;

  let priced: Set<string>;
  try {
    priced = await symbolsWithRecentBars(unique);
  } catch {
    return calls;
  }

  const missing = calls.filter((c) => !priced.has(c.symbol.toUpperCase()));
  if (missing.length === 0) return calls;

  const key = envKey("OPENAI_API_KEY");
  if (!key) return calls;

  try {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const { default: OpenAI } = await import("openai");
    const { zodTextFormat } = await import("openai/helpers/zod");
    const client = new OpenAI({ apiKey: key });
    const res = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content:
            "You map companies to their official NYSE/NASDAQ ticker. Only change a ticker when you are confident. Copy every letter (APPS not APS). If unsure, return the original ticker as `to`.",
        },
        {
          role: "user",
          content: JSON.stringify(
            missing.map((c) => ({
              symbol: c.symbol,
              companyName: c.companyName,
            })),
          ),
        },
      ],
      text: { format: zodTextFormat(Corrections, "corrections") },
    });
    const parsed = res.output_parsed;
    if (!parsed) return calls;

    const map = new Map<string, string>();
    for (const row of parsed.corrections) {
      const from = row.from.toUpperCase();
      const to = row.to.toUpperCase();
      if (SYMBOL_RE.test(to) && to !== from) map.set(from, to);
    }
    if (map.size === 0) return calls;

    const next = calls.map((c) => {
      const to = map.get(c.symbol.toUpperCase());
      return to ? { ...c, symbol: to } : c;
    });
    const nextSymbols = [
      ...new Set(next.map((c) => c.symbol.toUpperCase())),
    ];
    const confirmed = await symbolsWithRecentBars(nextSymbols);
    return next.map((c, i) =>
      confirmed.has(c.symbol.toUpperCase()) ? c : calls[i],
    );
  } catch {
    return calls;
  }
}
