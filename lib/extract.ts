import { z } from "zod";
import { envKey } from "./env";

export const ExtractedCall = z.object({
  symbol: z.string(),
  direction: z.enum(["long", "short"]),
  horizonDays: z.number().int().min(1).max(730),
  rationale: z.string(),
  quote: z.string(),
  quoteStartSeconds: z.number().int().min(0).nullable(),
});

const Extraction = z.object({ calls: z.array(ExtractedCall) });

export type ExtractedCall = z.infer<typeof ExtractedCall>;

const SYMBOL_RE = /^[A-Z]{1,5}$/;

const SYSTEM = `You extract concrete, actionable trade calls from a finance YouTuber's video transcript.

Rules:
- Only extract a call when the speaker expresses a directional view on a specific, identifiable publicly traded ticker.
- Do NOT extract: general market commentary with no ticker, news recaps, hypotheticals, descriptions of what someone else thinks, or "I might look at this".
- A ticker mentioned only in passing is not a call.
- Prefer fewer, higher-quality calls. Returning an empty list is correct and common.
- The quote must be copied verbatim from the transcript.`;

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
  transcript: string,
): Promise<{ calls: ExtractedCall[]; model: string }> {
  const key = envKey("OPENAI_API_KEY");
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local to extract trade calls.",
    );
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
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
  if (!parsed) {
    throw new Error("The model returned no structured extraction.");
  }

  return { calls: sane(parsed.calls), model };
}
