"use client";

import Link from "next/link";
import { relativeDays } from "@/lib/format";
import type { CallRow } from "@/lib/queries";
import { CallItem } from "../components/CallItem";
import { FollowButton } from "../components/FollowButton";
import { useFollows } from "../components/follows";
import { Avatar, Card, Empty, SectionHeading } from "../components/ui";

type ChannelOption = { id: string; name: string; handle: string };

export function FeedClient({
  calls,
  channels,
}: {
  calls: CallRow[];
  channels: ChannelOption[];
}) {
  const { follows } = useFollows();

  if (follows.length === 0) {
    return (
      <div className="space-y-6">
        <Empty>
          You are not following anyone yet. Pick a few channels and their recent
          calls will collect here.
        </Empty>
        <div>
          <SectionHeading title="Channels to follow" />
          <Card className="divide-y divide-ink-800/70">
            {channels.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={c.name} size={32} />
                <Link
                  href={`/influencers/${encodeURIComponent(c.handle)}`}
                  className="min-w-0"
                >
                  <span className="block truncate text-sm font-medium hover:text-white">
                    {c.name}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {c.handle}
                  </span>
                </Link>
                <span className="ml-auto">
                  <FollowButton handle={c.handle} />
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  const mine = calls.filter((c) => follows.includes(c.channelHandle));

  // One block per video, so the feed reads as "what did they just publish".
  const byVideo = new Map<string, CallRow[]>();
  for (const c of mine) {
    const list = byVideo.get(c.videoId) ?? [];
    list.push(c);
    byVideo.set(c.videoId, list);
  }
  const videos = [...byVideo.values()].sort(
    (a, b) => b[0].publishedAt - a[0].publishedAt,
  );

  const openCount = mine.filter((c) => c.excessReturn === null).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Following {follows.length}{" "}
        {follows.length === 1 ? "channel" : "channels"} · {videos.length} recent{" "}
        {videos.length === 1 ? "video" : "videos"} · {openCount} call
        {openCount === 1 ? "" : "s"} still open
      </p>

      {videos.length === 0 ? (
        <Empty>
          Nothing recent from the channels you follow. New uploads show up here
          once the pipeline picks them up.
        </Empty>
      ) : (
        <div className="space-y-4">
          {videos.map((group) => {
            const head = group[0];
            return (
              <Card key={head.videoId}>
                <div className="flex items-start gap-3 border-b border-ink-800/70 px-4 py-3">
                  <Avatar name={head.channelName} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/influencers/${encodeURIComponent(head.channelHandle)}`}
                      className="text-sm font-medium hover:text-white"
                    >
                      {head.channelName}
                    </Link>
                    <p className="truncate text-xs text-ink-500">
                      {head.videoTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {relativeDays(head.publishedAt)}
                  </span>
                </div>
                <div className="divide-y divide-ink-800/70">
                  {group.map((c) => (
                    <CallItem key={c.id} call={c} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
