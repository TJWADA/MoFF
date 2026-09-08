"use client";

import Link from "next/link";
import { useState } from "react";
import { RECENT_VIDEO_LIMIT, type ChannelVideo } from "@/lib/youtube";

const PAGE_SIZE = RECENT_VIDEO_LIMIT;

export function ChannelVideoList({
  channelId,
  videos,
  q,
}: {
  channelId: string;
  videos: ChannelVideo[];
  q: string;
}) {
  const [visible, setVisible] = useState(
    Math.min(PAGE_SIZE, videos.length),
  );

  const shown = videos.slice(0, visible);
  const hasMore = visible < videos.length;

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

      {hasMore ? (
        <button
          type="button"
          onClick={() =>
            setVisible((n) => Math.min(n + PAGE_SIZE, videos.length))
          }
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          View more past videos
        </button>
      ) : null}
    </div>
  );
}
