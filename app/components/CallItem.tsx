import { relativeDays, shortDate, timecode, youtubeUrl } from "@/lib/format";
import type { CallRow } from "@/lib/queries";
import { ChannelLink, DirectionBadge, Pct } from "./ui";

export function CallItem({
  call,
  showChannel = false,
}: {
  call: CallRow;
  showChannel?: boolean;
}) {
  const resolved = call.excessReturn !== null;

  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="nums text-sm font-semibold">{call.symbol}</span>
        <DirectionBadge direction={call.direction} />
        <span className="text-xs text-ink-500">
          {call.horizonDays}d · conviction {call.conviction.toFixed(2)}
        </span>

        {showChannel && (
          <span className="min-w-36">
            <ChannelLink
              name={call.channelName}
              handle={call.channelHandle}
              size={22}
              subtitle={relativeDays(call.publishedAt)}
            />
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {resolved ? (
            <>
              <span className="text-right text-sm font-semibold">
                <Pct value={call.excessReturn as number} />
              </span>
              <span
                className={`w-10 text-right text-xs font-medium ${
                  call.hit ? "text-bull-500" : "text-bear-500"
                }`}
              >
                {call.hit ? "hit" : "miss"}
              </span>
            </>
          ) : (
            <span className="rounded-full border border-ink-700/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-500">
              open
            </span>
          )}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-xs text-ink-500 italic">
        &ldquo;{call.quote}&rdquo;
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-700">
        {!showChannel && <span>{shortDate(call.publishedAt)}</span>}
        {resolved && (
          <span className="nums">
            {call.entryDate} @ {call.entryPrice?.toFixed(2)} →{" "}
            {call.exitDate} @ {call.exitPrice?.toFixed(2)}
          </span>
        )}
        <a
          href={youtubeUrl(call.videoId, call.quoteStartSeconds)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent-500 hover:underline"
        >
          watch
          {timecode(call.quoteStartSeconds)
            ? ` at ${timecode(call.quoteStartSeconds)}`
            : ""}
        </a>
      </div>
    </div>
  );
}
