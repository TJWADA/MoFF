"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loadMoreChannelVideos } from "@/app/actions/channel-videos";
import { RECENT_VIDEO_LIMIT, type ChannelVideo } from "@/lib/youtube";

const PAGE_SIZE = RECENT_VIDEO_LIMIT;

export function ChannelVideoList({
  channelId,
  videos: initialVideos,
  continuation: initialContinuation,
  q,
}: {
  channelId: string;
  videos: ChannelVideo[];
  continuation: string | null;
  q: string;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [continuation, setContinuation] = useState(initialContinuation);
  const [visible, setVisible] = useState(
    Math.min(PAGE_SIZE, initialVideos.length),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = videos.slice(0, visible);
  const hasLocalMore = visible < videos.length;
  const hasMore = hasLocalMore || Boolean(continuation);

  function onMore() {
    if (hasLocalMore) {
      setVisible((n) => Math.min(n + PAGE_SIZE, videos.length));
      return;
    }
    if (!continuation || pending) return;

    const token = continuation;
    startTransition(async () => {
      setError(null);
      const next = await loadMoreChannelVideos(token);
      if (next.status === "error") {
        setError(next.message);
        return;
      }

      const existing = new Set(videos.map((v) => v.id));
      const fresh = next.videos.filter((v) => !existing.has(v.id));
      const merged = [...videos, ...fresh];
      setVideos(merged);
      setContinuation(
        fresh.length === 0 && next.continuation === token
          ? null
          : next.continuation,
      );
      setVisible((n) => Math.min(n + PAGE_SIZE, merged.length));
    });
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((video) => (
          <li key={video.id}>
            <Link
              href={`/channel/${channelId}/video/${video.id}${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="flex gap-3 py-3 hover:bg-hover"
            >
              {video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  width={160}
                  height={90}
                  className="h-[72px] w-32 shrink-0 bg-hover object-cover"
                />
              ) : null}
              <div className="min-w-0 self-center">
                <div className="leading-snug">{video.title}</div>
                {video.publishedLabel ? (
                  <div className="mt-1 text-sm text-mute">
                    {video.publishedLabel}
                  </div>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {hasMore ? (
        <button
          type="button"
          disabled={pending}
          onClick={onMore}
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
        >
          {pending ? "Loading older videos…" : "View more past videos"}
        </button>
      ) : null}
    </div>
  );
}
