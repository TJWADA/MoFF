import Link from "next/link";
import { ChannelVideoList } from "@/app/components/channel-video-list";
import { fetchChannelProfile } from "@/lib/youtube";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const q = ((await searchParams).q ?? "").trim();
  const backHref = q ? `/search?q=${encodeURIComponent(q)}` : "/";

  let profile;
  try {
    profile = await fetchChannelProfile(id);
  } catch (err) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back
        </Link>
        <h1 className="font-medium text-danger">Could not load channel</h1>
        <p className="text-sm">
          {err instanceof Error ? err.message : "Unknown error"}
        </p>
        <p className="text-sm text-mute">
          Channel id <code>{id}</code>. Real channel ids start with UC.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href={backHref}
        className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline"
      >
        ← Back to channels
      </Link>

      <header className="flex gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-full bg-hover object-cover"
          />
        ) : (
          <div className="h-[72px] w-[72px] shrink-0 rounded-full bg-hover" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight">{profile.name}</h1>
          {profile.handle ? (
            <p className="mt-1 text-sm text-mute">{profile.handle}</p>
          ) : null}
        </div>
      </header>

      {profile.description ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">About</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-mute">
            {profile.description}
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent videos</h2>
        {profile.videos.length === 0 ? (
          <p className="text-sm text-mute">This channel has no videos.</p>
        ) : (
          <ChannelVideoList
            channelId={id}
            videos={profile.videos}
            continuation={profile.videosContinuation}
            q={q}
          />
        )}
      </section>
    </div>
  );
}
