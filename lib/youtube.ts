import { XMLParser } from "fast-xml-parser";
import { MODE } from "./env";
import { fixtureVideos } from "./fixtures";

export type DiscoveredVideo = {
  id: string;
  channelId: string;
  title: string;
  publishedAt: number;
  isShort: boolean;
};

const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type FeedEntry = {
  "yt:videoId": string;
  "yt:channelId": string;
  title: string;
  published: string;
};

/**
 * The RSS feed is quota-free, needs no API key, and works from datacenter IPs
 * -- unlike the Data API, which as of June 2026 allows only 100 search.list
 * calls a day. It returns at most the 15 most recent uploads, so a channel that
 * posts more than that between polls will drop videos.
 */
export async function fetchChannelFeed(
  channelId: string,
): Promise<DiscoveredVideo[]> {
  const res = await fetch(`${FEED}${channelId}`, {
    headers: { "User-Agent": "MoFF/0.1 (+https://github.com/moff)" },
  });
  if (!res.ok) throw new Error(`RSS ${channelId}: HTTP ${res.status}`);

  const parsed = parser.parse(await res.text()) as {
    feed?: { entry?: FeedEntry | FeedEntry[] };
  };
  const raw = parsed.feed?.entry;
  if (!raw) return [];
  const entries = Array.isArray(raw) ? raw : [raw];

  return entries.map((e) => ({
    id: String(e["yt:videoId"]),
    channelId: String(e["yt:channelId"]),
    title: String(e.title),
    publishedAt: Date.parse(e.published),
    isShort: false,
  }));
}

/**
 * The feed does not flag Shorts. YouTube redirects /shorts/<id> to /watch for
 * regular uploads, so a non-redirecting response means it really is a Short.
 * Only worth calling for videos we have not seen before.
 */
export async function isShort(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function discoverVideos(
  channelIds: string[],
): Promise<DiscoveredVideo[]> {
  if (MODE !== "live") {
    const known = new Set(channelIds);
    return fixtureVideos()
      .filter((v) => known.has(v.channelId))
      .map((v) => ({
        id: v.id,
        channelId: v.channelId,
        title: v.title,
        publishedAt: Date.parse(v.publishedAt),
        isShort: v.isShort,
      }));
  }

  const out: DiscoveredVideo[] = [];
  for (const channelId of channelIds) {
    try {
      out.push(...(await fetchChannelFeed(channelId)));
    } catch (err) {
      console.warn(`  discover ${channelId} failed: ${(err as Error).message}`);
    }
  }
  return out;
}
