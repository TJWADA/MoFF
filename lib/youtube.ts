/**
 * YouTube lookups for this slice go through YouTube's public web client —
 * the same JSON the website uses. No Google Cloud API key.
 *
 * Later pipeline hops (transcripts, extraction, scoring) will attach to a
 * video id from this list.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

/** YouTube's own "Search for channels" filter. */
const SEARCH_CHANNELS_PARAMS = "EgIQAg==";

/** YouTube's own channel "Videos" tab. */
const CHANNEL_VIDEOS_TAB_PARAMS = "EgZ2aWRlb3PyBgQKAjoA";

const INNERTUBE = {
  clientName: "WEB",
  clientVersion: "2.20260101.00.00",
  hl: "en",
  gl: "US",
} as const;

export type ParsedQuery =
  | { kind: "id"; id: string }
  | { kind: "handle"; handle: string }
  | { kind: "page"; url: string }
  | { kind: "search"; q: string };

export type ChannelHit = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  subscribers: string | null;
  description: string | null;
};

export type ChannelVideo = {
  id: string;
  title: string;
  publishedLabel: string | null;
  thumbnailUrl: string | null;
  url: string;
};

export type ChannelProfile = {
  id: string;
  name: string;
  handle: string | null;
  description: string | null;
  avatarUrl: string | null;
  videos: ChannelVideo[];
};

/** How many recent uploads to show initially on the channel page. */
export const RECENT_VIDEO_LIMIT = 6;

/** How many uploads to fetch from YouTube's Videos tab (first page). */
export const CHANNEL_VIDEO_FETCH_LIMIT = 30;

export type VideoMeta = {
  id: string;
  title: string;
  authorName: string;
  /** ISO date YYYY-MM-DD (UTC calendar day of publish). */
  publishedAt: string;
};

function absUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.simpleText === "string") return rec.simpleText;
    if (typeof rec.content === "string") return rec.content;
    const runs = rec.runs;
    if (Array.isArray(runs)) {
      return (
        runs
          .map((run) =>
            run && typeof run === "object"
              ? String((run as { text?: unknown }).text ?? "")
              : "",
          )
          .join("")
          .trim() || null
      );
    }
  }
  return null;
}

async function innertube(path: string, payload: Record<string, unknown>) {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/${path}?prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        context: { client: INNERTUBE },
        ...payload,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`YouTube ${path} returned HTTP ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

function walk(node: unknown, visit: (obj: Record<string, unknown>) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const rec = node as Record<string, unknown>;
  visit(rec);
  for (const value of Object.values(rec)) walk(value, visit);
}

/** Classify what the user typed so we hit the cheapest YouTube endpoint. */
export function parseYouTubeQuery(raw: string): ParsedQuery {
  const q = raw.trim();
  if (!q) return { kind: "search", q: "" };

  const asUrl = /^https?:\/\//i.test(q) ? q : `https://${q}`;
  try {
    const url = new URL(asUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && parts[1] && CHANNEL_ID_RE.test(parts[1])) {
        return { kind: "id", id: parts[1] };
      }
      if (parts[0]?.startsWith("@")) {
        return { kind: "handle", handle: parts[0].slice(1) };
      }
      if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
        return {
          kind: "page",
          url: `https://www.youtube.com/${parts[0]}/${parts[1]}`,
        };
      }
    }
  } catch {
    // Not a URL — fall through to id / handle / search.
  }

  if (CHANNEL_ID_RE.test(q)) return { kind: "id", id: q };
  if (q.startsWith("@") && q.length > 1) {
    return { kind: "handle", handle: q.replace(/^@+/, "") };
  }
  return { kind: "search", q };
}

/**
 * Resolve @handle (or a /c/ /user/ URL) by fetching the public channel page
 * and reading the canonical channel id YouTube embeds in the HTML.
 *
 * Prefer `externalId` over the first `"channelId"` occurrence — related
 * channels also appear in the page and match first.
 */
export async function resolveChannelPage(url: string): Promise<ChannelHit> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`YouTube returned HTTP ${res.status} for ${url}`);
  }
  const html = await res.text();

  const externalId = html.match(/"externalId":"(UC[\w-]{22})"/)?.[1];
  const canonical = html.match(
    /https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})/,
  )?.[1];
  const id = externalId ?? canonical;
  if (!id) {
    throw new Error(`Could not find a channel id on ${url}`);
  }

  const name =
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? id;
  const handle =
    html.match(/"canonicalBaseUrl":"\/(@[\w.-]+)"/)?.[1] ??
    html.match(/https:\/\/www\.youtube\.com\/(@[\w.-]+)/)?.[1] ??
    null;
  const avatarUrl =
    html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;

  return { id, name, handle, avatarUrl, subscribers: null, description: null };
}

export async function resolveHandle(handle: string): Promise<ChannelHit> {
  const clean = handle.replace(/^@+/, "");
  return resolveChannelPage(`https://www.youtube.com/@${clean}`);
}

function readChannelRenderer(raw: unknown): ChannelHit | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id = typeof rec.channelId === "string" ? rec.channelId : null;
  if (!id || !CHANNEL_ID_RE.test(id)) return null;

  const name = firstString(rec.title) ?? id;
  const nav = rec.navigationEndpoint as
    | { browseEndpoint?: { canonicalBaseUrl?: string } }
    | undefined;
  const canonical = nav?.browseEndpoint?.canonicalBaseUrl ?? null;
  const handleFromCanonical =
    canonical?.startsWith("@") || canonical?.startsWith("/@")
      ? canonical.replace(/^\//, "")
      : null;
  // On WEB search, subscriberCountText is often the @handle.
  const maybeHandle = firstString(rec.subscriberCountText);
  const handle = maybeHandle?.startsWith("@")
    ? maybeHandle
    : handleFromCanonical;

  const thumbs =
    rec.thumbnail && typeof rec.thumbnail === "object"
      ? (rec.thumbnail as { thumbnails?: { url?: string }[] }).thumbnails
      : undefined;
  const avatarUrl = absUrl(thumbs?.at(-1)?.url);
  const subscribers = firstString(rec.videoCountText);
  const description = firstString(rec.descriptionSnippet);

  return { id, name, handle, avatarUrl, subscribers, description };
}

export async function searchChannels(query: string): Promise<ChannelHit[]> {
  const body = await innertube("search", {
    query,
    params: SEARCH_CHANNELS_PARAMS,
  });

  const hits: ChannelHit[] = [];
  const seen = new Set<string>();
  walk(body, (obj) => {
    if (!("channelRenderer" in obj)) return;
    const hit = readChannelRenderer(obj.channelRenderer);
    if (!hit || seen.has(hit.id)) return;
    seen.add(hit.id);
    hits.push(hit);
  });
  return hits.slice(0, 8);
}

export async function fetchChannelProfile(
  channelId: string,
  options?: { videoLimit?: number },
): Promise<ChannelProfile> {
  if (!CHANNEL_ID_RE.test(channelId)) {
    throw new Error(`Not a YouTube channel id: ${channelId}`);
  }

  const videoLimit = options?.videoLimit ?? CHANNEL_VIDEO_FETCH_LIMIT;

  const body = await innertube("browse", {
    browseId: channelId,
    params: CHANNEL_VIDEOS_TAB_PARAMS,
  });

  const rec = body as {
    metadata?: {
      channelMetadataRenderer?: {
        title?: string;
        vanityChannelUrl?: string;
        description?: string;
        avatar?: { thumbnails?: { url?: string }[] };
      };
    };
  };
  const meta = rec.metadata?.channelMetadataRenderer;
  const name = meta?.title ?? channelId;
  const vanity = meta?.vanityChannelUrl ?? "";
  const handle = vanity.match(/(@[\w.-]+)/)?.[1] ?? null;
  const description = meta?.description?.trim() || null;
  const avatarUrl = absUrl(meta?.avatar?.thumbnails?.at(-1)?.url);

  const videos: ChannelVideo[] = [];
  const seen = new Set<string>();
  walk(body, (obj) => {
    if (videoLimit > 0 && videos.length >= videoLimit) return;

    const lockup = obj.lockupViewModel as
      | {
          contentId?: string;
          contentType?: string;
          metadata?: { lockupMetadataViewModel?: { title?: { content?: string } } };
          contentImage?: {
            thumbnailViewModel?: { image?: { sources?: { url?: string }[] } };
          };
        }
      | undefined;
    if (!lockup?.contentId) return;
    if (lockup.contentType && lockup.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") {
      return;
    }
    if (seen.has(lockup.contentId)) return;
    seen.add(lockup.contentId);

    videos.push({
      id: lockup.contentId,
      title:
        lockup.metadata?.lockupMetadataViewModel?.title?.content ??
        lockup.contentId,
      publishedLabel: publishedFromLockup(obj),
      thumbnailUrl:
        absUrl(lockup.contentImage?.thumbnailViewModel?.image?.sources?.at(-1)?.url) ??
        `https://i.ytimg.com/vi/${lockup.contentId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${lockup.contentId}`,
    });
  });

  return { id: channelId, name, handle, description, avatarUrl, videos };
}

/** Resolve any parsed query into a channel list (always one step before the channel page). */
export async function channelsForQuery(
  parsed: ParsedQuery,
): Promise<ChannelHit[]> {
  if (parsed.kind === "search") {
    if (!parsed.q) return [];
    return searchChannels(parsed.q);
  }

  if (parsed.kind === "id") {
    const profile = await fetchChannelProfile(parsed.id, { videoLimit: 0 });
    return [
      {
        id: profile.id,
        name: profile.name,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        subscribers: null,
        description: profile.description?.slice(0, 200) ?? null,
      },
    ];
  }

  const channel =
    parsed.kind === "handle"
      ? await resolveHandle(parsed.handle)
      : await resolveChannelPage(parsed.url);
  return [channel];
}

export async function fetchVideoMeta(videoId: string): Promise<VideoMeta> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const [oembedRes, pageRes] = await Promise.all([
    fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { next: { revalidate: 3600 } },
    ),
    fetch(watchUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    }),
  ]);

  if (!oembedRes.ok) {
    throw new Error(`Could not load video metadata (HTTP ${oembedRes.status})`);
  }
  const data = (await oembedRes.json()) as {
    title?: string;
    author_name?: string;
  };

  let publishedAt: string | null = null;
  if (pageRes.ok) {
    const html = await pageRes.text();
    const raw =
      html.match(/"publishDate":"([^"]+)"/)?.[1] ??
      html.match(/"uploadDate":"([^"]+)"/)?.[1] ??
      html.match(/itemprop="datePublished" content="([^"]+)"/)?.[1] ??
      null;
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        publishedAt = d.toISOString().slice(0, 10);
      }
    }
  }

  if (!publishedAt) {
    throw new Error(`Could not find a publish date for video ${videoId}`);
  }

  return {
    id: videoId,
    title: data.title ?? videoId,
    authorName: data.author_name ?? "YouTube",
    publishedAt,
  };
}

function publishedFromLockup(obj: Record<string, unknown>): string | null {
  let label: string | null = null;
  walk(obj.lockupViewModel, (inner) => {
    if (label) return;
    const parts = inner.metadataParts as unknown[] | undefined;
    if (!Array.isArray(parts)) return;
    for (const part of parts) {
      const text = firstString(
        part && typeof part === "object"
          ? (part as { text?: unknown }).text
          : null,
      );
      if (text && /(ago|Stream|Live)/i.test(text)) {
        label = text;
        return;
      }
    }
  });
  return label;
}
