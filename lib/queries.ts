import { desc, eq, isNotNull } from "drizzle-orm";
import { buildConsensus, isActive, type Stance } from "./consensus";
import { db } from "./db";
import { calls, channels, videos } from "./db/schema";
import { summarise, type ChannelStats } from "./scoring";

export type CallRow = {
  id: number;
  symbol: string;
  direction: "long" | "short";
  conviction: number;
  horizonDays: number;
  rationale: string;
  quote: string;
  quoteStartSeconds: number | null;
  entryDate: string | null;
  entryPrice: number | null;
  exitDate: string | null;
  exitPrice: number | null;
  excessReturn: number | null;
  hit: boolean | null;
  videoId: string;
  videoTitle: string;
  publishedAt: number;
  channelId: string;
  channelName: string;
  channelHandle: string;
};

const CALL_COLUMNS = {
  id: calls.id,
  symbol: calls.symbol,
  direction: calls.direction,
  conviction: calls.conviction,
  horizonDays: calls.horizonDays,
  rationale: calls.rationale,
  quote: calls.quote,
  quoteStartSeconds: calls.quoteStartSeconds,
  entryDate: calls.entryDate,
  entryPrice: calls.entryPrice,
  exitDate: calls.exitDate,
  exitPrice: calls.exitPrice,
  excessReturn: calls.excessReturn,
  hit: calls.hit,
  videoId: videos.id,
  videoTitle: videos.title,
  publishedAt: videos.publishedAt,
  channelId: channels.id,
  channelName: channels.name,
  channelHandle: channels.handle,
} as const;

function allCalls() {
  return db
    .select(CALL_COLUMNS)
    .from(calls)
    .innerJoin(videos, eq(videos.id, calls.videoId))
    .innerJoin(channels, eq(channels.id, videos.channelId));
}

export async function getConsensus() {
  const rows = await allCalls();
  const bySymbol = new Map<string, Stance[]>();

  for (const r of rows) {
    if (!isActive(r.publishedAt, r.horizonDays)) continue;
    const stance: Stance = {
      channelId: r.channelId,
      channelName: r.channelName,
      channelHandle: r.channelHandle,
      direction: r.direction,
      conviction: r.conviction,
      videoId: r.videoId,
      videoTitle: r.videoTitle,
      publishedAt: r.publishedAt,
      quote: r.quote,
      quoteStartSeconds: r.quoteStartSeconds,
      horizonDays: r.horizonDays,
    };
    const list = bySymbol.get(r.symbol) ?? [];
    list.push(stance);
    bySymbol.set(r.symbol, list);
  }

  return buildConsensus(bySymbol);
}

export type LeaderboardRow = ChannelStats & {
  id: string;
  name: string;
  handle: string;
  open: number;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await allCalls();
  const everyChannel = await db.select().from(channels);

  return everyChannel
    .map((c) => {
      const mine = rows.filter((r) => r.channelId === c.id);
      const resolved = mine.filter(
        (r) => r.excessReturn !== null && r.hit !== null,
      );
      return {
        id: c.id,
        name: c.name,
        handle: c.handle,
        open: mine.length - resolved.length,
        ...summarise(
          resolved.map((r) => ({
            excessReturn: r.excessReturn as number,
            hit: r.hit as boolean,
          })),
        ),
      };
    })
    .sort((a, b) => {
      if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
      return b.avgExcessReturn - a.avgExcessReturn;
    });
}

export async function getChannelByHandle(handle: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.handle, handle))
    .limit(1);
  if (!channel) return undefined;

  const rows = (await allCalls()).filter((r) => r.channelId === channel.id);
  rows.sort((a, b) => b.publishedAt - a.publishedAt);

  const resolved = rows.filter((r) => r.excessReturn !== null);
  const stats = summarise(
    resolved.map((r) => ({
      excessReturn: r.excessReturn as number,
      hit: r.hit as boolean,
    })),
  );

  const ranked = [...resolved].sort(
    (a, b) => (b.excessReturn as number) - (a.excessReturn as number),
  );

  return {
    channel,
    stats,
    calls: rows as CallRow[],
    best: ranked[0],
    worst: ranked[ranked.length - 1],
  };
}

export async function getRecentCalls(limit = 40): Promise<CallRow[]> {
  return (await db
    .select(CALL_COLUMNS)
    .from(calls)
    .innerJoin(videos, eq(videos.id, calls.videoId))
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .orderBy(desc(videos.publishedAt))
    .limit(limit)) as CallRow[];
}

export async function getRecentlyResolved(limit = 12): Promise<CallRow[]> {
  return (await db
    .select(CALL_COLUMNS)
    .from(calls)
    .innerJoin(videos, eq(videos.id, calls.videoId))
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .where(isNotNull(calls.excessReturn))
    .orderBy(desc(calls.exitDate))
    .limit(limit)) as CallRow[];
}

export async function getAllChannels() {
  return db.select().from(channels).orderBy(channels.name);
}
