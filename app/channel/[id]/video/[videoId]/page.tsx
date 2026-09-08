import Link from "next/link";
import { AnalyzeForm } from "@/app/components/analyze-form";
import { fetchChannelProfile, fetchVideoMeta } from "@/lib/youtube";

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; videoId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id, videoId } = await params;
  const q = ((await searchParams).q ?? "").trim();
  const channelHref = `/channel/${id}${q ? `?q=${encodeURIComponent(q)}` : ""}`;

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
    } catch (err) {
      return (
        <div className="space-y-4">
          <Link
            href={channelHref}
            className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
          >
            ← Back to channel
          </Link>
          <h1 className="font-medium text-danger">Could not load video</h1>
          <p className="text-sm">
            {err instanceof Error ? err.message : "Unknown error"}
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={channelHref}
        className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
      >
        ← Back to {channelName}
      </Link>

      <section className="space-y-3">
        <div className="aspect-video overflow-hidden border border-line bg-ink">
          <iframe
            title={videoTitle}
            src={`https://www.youtube.com/embed/${videoId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-medium">{videoTitle}</h1>
            <p className="mt-1 text-sm text-mute">
              {channelName}
              {publishedAt ? ` · ${publishedAt}` : ""}
            </p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
          >
            YouTube
          </a>
        </div>
      </section>

      {publishedAt ? (
        <AnalyzeForm videoId={videoId} publishedAt={publishedAt} />
      ) : (
        <p className="text-sm text-danger">
          Could not determine this video&rsquo;s publish date, so backtests
          are unavailable.
        </p>
      )}
    </div>
  );
}
