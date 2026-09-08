import { z } from "zod";
import type { ExtractedCall } from "./extract";

const CallParam = z.object({
  symbol: z.string(),
  companyName: z.string().optional().default(""),
  direction: z.enum(["long", "short"]),
  horizonDays: z.number().int().min(1).max(730),
  rationale: z.string(),
  quote: z.string(),
  quoteStartSeconds: z.number().int().min(0).nullable(),
});

export function tradeHref({
  channelId,
  videoId,
  call,
  q,
}: {
  channelId: string;
  videoId: string;
  call: ExtractedCall;
  q?: string;
}): string {
  const params = new URLSearchParams();
  params.set("direction", call.direction);
  if (q) params.set("q", q);
  const callJson = encodeURIComponent(
    JSON.stringify({
      symbol: call.symbol,
      companyName: call.companyName ?? "",
      direction: call.direction,
      horizonDays: call.horizonDays,
      rationale: call.rationale,
      quote: call.quote,
      quoteStartSeconds: call.quoteStartSeconds,
    }),
  );
  return `/channel/${channelId}/video/${videoId}/trade/${encodeURIComponent(call.symbol)}?${params.toString()}&call=${callJson}`;
}

export function parseCallParam(
  raw: string | string[] | undefined,
): ExtractedCall | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    return CallParam.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
