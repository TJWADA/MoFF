import type { SymbolConsensus } from "@/lib/consensus";
import { relativeDays, timecode, youtubeUrl } from "@/lib/format";
import { Card, ConsensusLabel, DirectionBadge, SplitBar } from "./ui";
import Link from "next/link";

export function ConsensusCard({
  item,
  maxStances = 4,
}: {
  item: SymbolConsensus;
  maxStances?: number;
}) {
  const shown = item.stances.slice(0, maxStances);
  const hidden = item.stances.length - shown.length;

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="nums text-lg font-semibold tracking-tight">
            {item.symbol}
          </div>
          <div className="mt-0.5 text-xs text-ink-500">
            <span className="text-bull-500">{item.bulls} bullish</span>
            {" · "}
            <span className="text-bear-500">{item.bears} bearish</span>
          </div>
        </div>
        <ConsensusLabel label={item.label} />
      </div>

      <div className="mt-3">
        <SplitBar bulls={item.bulls} bears={item.bears} />
      </div>

      <ul className="mt-3 space-y-2.5">
        {shown.map((s) => (
          <li key={`${s.channelId}-${s.videoId}`} className="text-xs">
            <div className="flex items-center gap-2">
              <DirectionBadge direction={s.direction} />
              <Link
                href={`/influencers/${encodeURIComponent(s.channelHandle)}`}
                className="truncate font-medium text-ink-300 hover:text-ink-100"
              >
                {s.channelName}
              </Link>
              <span className="ml-auto shrink-0 text-ink-500">
                {relativeDays(s.publishedAt)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 pl-1 text-ink-500 italic">
              &ldquo;{s.quote}&rdquo;
            </p>
            <a
              href={youtubeUrl(s.videoId, s.quoteStartSeconds)}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-0.5 inline-block pl-1 text-[11px] text-accent-500 hover:underline"
            >
              watch{timecode(s.quoteStartSeconds) ? ` at ${timecode(s.quoteStartSeconds)}` : ""}
            </a>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <p className="mt-2 text-[11px] text-ink-500">
          +{hidden} more {hidden === 1 ? "view" : "views"}
        </p>
      )}
    </Card>
  );
}
