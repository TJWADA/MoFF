import { z } from "zod";
import { liveKey } from "./env";
import { fixtureCalls } from "./fixtures";

export const PROMPT_VERSION = "v1";

const SYMBOL_RE = /^[A-Z]{1,5}$/;

export const ExtractedCall = z.object({
  symbol: z
    .string()
    .describe("Uppercase US ticker, e.g. NVDA. Never a company name."),
  direction: z
    .enum(["long", "short"])
    .describe("long if they expect it to rise, short if to fall."),
  conviction: z
    .number()
    .min(0)
    .max(1)
    .describe("0 = offhand mention, 1 = staking their reputation on it."),
  horizonDays: z
    .number()
    .int()
    .min(1)
    .max(730)
    .describe("Stated holding period in days. Use 90 if unstated."),
  rationale: z.string().describe("One sentence, in your own words."),
  quote: z
    .string()
    .describe("A short verbatim quote from the transcript backing the call."),
  quoteStartSeconds: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Offset of the quote in seconds if the transcript has timings."),
});

const Extraction = z.object({ calls: z.array(ExtractedCall) });

export type ExtractedCall = z.infer<typeof ExtractedCall>;

const SYSTEM = `You extract concrete, actionable trade calls from a finance YouTuber's video transcript.

Rules:
- Only extract a call when the speaker expresses a directional view on a specific, identifiable publicly traded ticker.
- Do NOT extract: general market commentary with no ticker, news recaps, hypotheticals, descriptions of what someone else thinks, or "I might look at this".
- A ticker mentioned only in passing is not a call.
- Prefer fewer, higher-quality calls. Returning an empty list is correct and common.
- conviction should reflect how strongly they commit, not how excited they sound.
- The quote must be copied verbatim from the transcript.`;

/** Drop anything that is not a plausible ticker before it reaches the database. */
function sane(calls: ExtractedCall[]): ExtractedCall[] {
  const seen = new Set<string>();
  return calls.filter((c) => {
    const symbol = c.symbol.toUpperCase();
    if (!SYMBOL_RE.test(symbol)) return false;
    const key = `${symbol}:${c.direction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    c.symbol = symbol;
    return true;
  });
}

export async function extractCalls(
  videoId: string,
  transcript: string,
): Promise<{ calls: ExtractedCall[]; model: string }> {
  const key = liveKey("OPENAI_API_KEY");

  if (key) {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const { default: OpenAI } = await import("openai");
      const { zodTextFormat } = await import("openai/helpers/zod");
      const client = new OpenAI({ apiKey: key });

      const res = await client.responses.parse({
        model,
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: transcript.slice(0, 120_000) },
        ],
        text: { format: zodTextFormat(Extraction, "extraction") },
      });

      const parsed = res.output_parsed;
      if (parsed) return { calls: sane(parsed.calls), model };
    } catch (err) {
      console.warn(`  extract ${videoId}: ${(err as Error).message}`);
    }
  }

  const fixture = fixtureCalls()[videoId] ?? [];
  return {
    calls: sane(fixture.map((c) => ({ ...c }))),
    model: "fixture",
  };
}
