import { eq, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import { calls, channels, transcripts, videos } from "./db/schema";
import { extractCalls, PROMPT_VERSION } from "./extract";
import { fetchTranscript } from "./transcripts";
import { discoverVideos, isShort } from "./youtube";
import { MODE } from "./env";

export const STAGE_NAMES = [
  "discover",
  "transcribe",
  "extract",
  "prices",
  "score",
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

/** Videos we track: never Shorts, since they rarely contain a real thesis. */
const TRACKED = sql`${videos.isShort} = 0`;

async function discover(): Promise<string> {
  const tracked = await db.select({ id: channels.id }).from(channels);
  if (tracked.length === 0) return "no channels seeded -- run pnpm db:seed";

  const found = await discoverVideos(tracked.map((c) => c.id));
  const known = new Set(
    (await db.select({ id: videos.id }).from(videos)).map((v) => v.id),
  );
  const fresh = found.filter((v) => !known.has(v.id));

  // Only pay for the Shorts probe on videos we have not seen before.
  if (MODE === "live") {
    for (const v of fresh) v.isShort = await isShort(v.id);
  }

  if (fresh.length) {
    await db.insert(videos).values(fresh).onConflictDoNothing();
  }
  const shorts = fresh.filter((v) => v.isShort).length;
  return `${fresh.length} new video(s)${shorts ? `, ${shorts} short(s) flagged` : ""}, ${known.size + fresh.length} total`;
}

async function transcribe(): Promise<string> {
  const pending = await db
    .select({ id: videos.id })
    .from(videos)
    .leftJoin(transcripts, eq(transcripts.videoId, videos.id))
    .where(sql`${isNull(transcripts.videoId)} and ${TRACKED}`);

  let ok = 0;
  for (const { id } of pending) {
    const t = await fetchTranscript(id);
    if (!t) continue;
    await db
      .insert(transcripts)
      .values({ videoId: id, text: t.text, provider: t.provider })
      .onConflictDoNothing();
    ok++;
  }
  return `${ok}/${pending.length} fetched, ${pending.length - ok} unavailable`;
}

async function extract(): Promise<string> {
  const scored = db.select({ id: calls.videoId }).from(calls);
  const pending = await db
    .select({ id: transcripts.videoId, text: transcripts.text })
    .from(transcripts)
    .where(notInArray(transcripts.videoId, scored));

  let produced = 0;
  for (const row of pending) {
    const { calls: found, model } = await extractCalls(row.id, row.text);
    if (found.length === 0) continue;
    await db
      .insert(calls)
      .values(
        found.map((c) => ({
          videoId: row.id,
          symbol: c.symbol,
          direction: c.direction,
          conviction: c.conviction,
          horizonDays: c.horizonDays,
          rationale: c.rationale,
          quote: c.quote,
          quoteStartSeconds: c.quoteStartSeconds,
          model,
          promptVersion: PROMPT_VERSION,
        })),
      )
      .onConflictDoNothing();
    produced += found.length;
  }
  return `${produced} call(s) from ${pending.length} transcript(s)`;
}

const STAGES: Record<StageName, () => Promise<string>> = {
  discover,
  transcribe,
  extract,
  prices: async () => "not implemented",
  score: async () => "not implemented",
};

export function runStage(name: StageName): Promise<string> {
  return STAGES[name]();
}
