import Link from "next/link";
import { BacktestChart } from "@/app/components/backtest-chart";
import { CallMetrics } from "@/app/components/call-metrics";
import { parseCallParam } from "@/lib/call-param";
import { recommendedHorizonDate } from "@/lib/backtest";
import { evaluateCalls } from "@/lib/evaluate";
import { formatCallName } from "@/lib/extract";
import { fetchChannelProfile, fetchVideoMeta } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; videoId: string; symbol: string }>;
  searchParams: Promise<{ q?: string; call?: string; direction?: string }>;
}) {
  const { id, videoId, symbol } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const videoHref = `/channel/${id}/video/${videoId}${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  const parsedCall = parseCallParam(sp.call);
  const ticker = decodeURIComponent(symbol).toUpperCase();

  if (
    !parsedCall ||
    parsedCall.symbol.toUpperCase() !== ticker ||
    (sp.direction && parsedCall.direction !== sp.direction)
  ) {
    return (
      <div className="space-y-4">
        <Link
          href={videoHref}
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to video
        </Link>
        <h1 className="font-medium text-danger">Could not load this trade</h1>
        <p className="text-sm text-mute">
          Open it again from the video’s extracted calls.
        </p>
      </div>
    );
  }

  let call = parsedCall;

  let channelName = id;
  let videoTitle = videoId;
  let publishedAt: string | null = null;

  try {
    const [profile, meta] = await Promise.all([
      fetchChannelProfile(id, { videoLimit: 0 }),
      fetchVideoMeta(videoId),
    ]);
    channelName = profile.name;
    videoTitle = meta.title;
    publishedAt = meta.publishedAt;
  } catch {
    try {
      const meta = await fetchVideoMeta(videoId);
      videoTitle = meta.title;
      channelName = meta.authorName;
      publishedAt = meta.publishedAt;
    } catch {
      publishedAt = null;
    }
  }

  if (!publishedAt) {
    return (
      <div className="space-y-4">
        <Link
          href={videoHref}
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to video
        </Link>
        <h1 className="font-medium">{formatCallName(call)}</h1>
        <p className="text-sm text-danger">
          Could not determine this video’s publish date, so we can’t check how
          the trade did.
        </p>
      </div>
    );
  }

  let result;
  let series;
  let error: string | null = null;
  try {
    const evaluated = await evaluateCalls([call], publishedAt, "trade");
    result = evaluated.results[0];
    series = evaluated.series;
    if (evaluated.calls[0]) call = evaluated.calls[0];
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn’t check how this trade did.";
  }

  return (
    <div className="space-y-6">
      <Link
        href={videoHref}
        className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
      >
        ← Back to video
      </Link>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="font-medium">{formatCallName(call)}</h1>
          {call.horizonDays != null ? (
            <span className="text-sm text-mute">
              ~{call.horizonDays}d recommended
            </span>
          ) : null}
        </div>
        <p className="text-sm text-mute">
          {channelName}
          {publishedAt ? ` · ${publishedAt}` : ""}
        </p>
        <p className="text-sm">{call.rationale}</p>
        <blockquote className="border-l-2 border-line pl-3 text-sm text-mute">
          &ldquo;{call.quote}&rdquo;
        </blockquote>
      </section>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : result ? (
        <section className="space-y-3 border-t border-line pt-4">
          <CallMetrics result={result} />
          <BacktestChart
            series={series ?? []}
            tradeLabel={formatCallName(call)}
            entryDate={result.entryDate}
            exitDate={result.exitDate}
            exitLabel="As of"
            horizonDate={recommendedHorizonDate(
              result.entryDate,
              call.horizonDays,
            )}
          />
        </section>
      ) : null}
    </div>
  );
}
