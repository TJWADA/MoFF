import { z } from "zod";
import { envKey } from "./env";
import { correctUnpricedCalls } from "./tickers";

export const ExtractedCall = z.object({
  symbol: z.string(),
  companyName: z.string(),
  direction: z.enum(["long", "short"]),
  horizonDays: z.number().int().min(1).max(730).nullable(),
  rationale: z.string(),
  quote: z.string(),
  quoteStartSeconds: z.number().int().min(0).nullable(),
});

const Extraction = z.object({ calls: z.array(ExtractedCall) });

export type ExtractedCall = z.infer<typeof ExtractedCall>;

const SYMBOL_RE = /^[A-Z]{1,5}$/;

const SYSTEM = `You extract upside stock ideas from a finance YouTuber's video transcript — names a viewer could buy as shares.

Rules:
- Only extract a call when the speaker is bullish on a specific, identifiable publicly traded ticker and you could express that view by buying the stock.
- Do NOT extract shorts, "fade this," or hedges that are short the name.
- Do NOT extract options trades: calls, puts, spreads, strikes, weeklys, LEAPs, or "buy the $X call." If they mention options but also clearly like owning the shares, extract the underlying stock idea only.
- Do NOT extract: general market commentary with no ticker, news recaps, hypotheticals, descriptions of what someone else thinks, or "I might look at this".
- A ticker mentioned only in passing is not a call.
- Prefer fewer, higher-quality calls. Returning an empty list is correct and common.
- The quote must be copied verbatim from the transcript.
- companyName is the short everyday name (Alibaba, Nvidia, Boeing), not the legal entity name and not the ticker.
- symbol must be the exact US-listed ticker, copied letter-for-letter. Do not drop characters (APPS not APS, TSLA not TSA).
- direction must be "long" (long the shares).
- horizonDays is the hold in calendar days ONLY when the speaker clearly states a timeframe (a week, a month, "next 90 days"). If they do not, return null. Do not invent 1-day horizons from breakout or "watch this level" language.`;

function sane(calls: ExtractedCall[]): ExtractedCall[] {
  const seen = new Set<string>();
  return calls.filter((c) => {
    if (c.direction !== "long") return false;
    const symbol = c.symbol.toUpperCase();
    if (!SYMBOL_RE.test(symbol)) return false;
    if (seen.has(symbol)) return false;
    seen.add(symbol);
    c.symbol = symbol;
    c.direction = "long";
    if (c.horizonDays != null && (c.horizonDays < 1 || c.horizonDays > 730)) {
      c.horizonDays = null;
    }
    const name = (c.companyName ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(new RegExp(`\\s*\\(${symbol}\\)\\s*$`, "i"), "")
      .trim();
    c.companyName = name.toUpperCase() === symbol ? "" : name;
    return true;
  });
}

export function formatCallName(
  call: Pick<ExtractedCall, "symbol"> & { companyName?: string },
): string {
  const name = (call.companyName ?? "").trim();
  return name ? `${name} (${call.symbol})` : call.symbol;
}

export async function extractCalls(
  transcript: string,
): Promise<{ calls: ExtractedCall[]; model: string }> {
  const key = envKey("OPENAI_API_KEY");
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local to extract upside stock ideas.",
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

  const calls = await correctUnpricedCalls(sane(parsed.calls));
  return { calls, model };
}
