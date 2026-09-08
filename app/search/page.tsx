import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchForm } from "../search-form";
import { channelsForQuery, parseYouTubeQuery } from "@/lib/youtube";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim();
  if (!q) redirect("/");

  const parsed = parseYouTubeQuery(q);

  let results;
  try {
    results = await channelsForQuery(parsed);
  } catch (err) {
    return (
      <ErrorPanel
        title="Search failed"
        detail={err instanceof Error ? err.message : "Unknown error"}
        query={q}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SearchForm defaultQuery={q} />
      <div>
        <h1 className="text-xl font-medium tracking-tight">Channels</h1>
        <p className="mt-1 text-sm text-mute">
          Results for &ldquo;{q}&rdquo;
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-mute">
          No channels matched. Try an @handle or a youtube.com URL.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {results.map((channel) => (
            <li key={channel.id}>
              <Link
                href={`/channel/${channel.id}?q=${encodeURIComponent(q)}`}
                className="flex gap-3 py-3 hover:bg-hover"
              >
                {channel.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full bg-hover object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-hover" />
                )}
                <div className="min-w-0">
                  <div className="truncate">{channel.name}</div>
                  <div className="truncate text-sm text-mute">
                    {[channel.handle, channel.subscribers]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {channel.description ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-mute">
                      {channel.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorPanel({
  title,
  detail,
  query,
}: {
  title: string;
  detail: string;
  query: string;
}) {
  return (
    <div className="space-y-4">
      <SearchForm defaultQuery={query} />
      <h1 className="font-medium text-danger">{title}</h1>
      <p className="text-sm">{detail}</p>
      <p className="text-sm text-mute">
        Query was &ldquo;{query}&rdquo;. A channel URL or @handle is the most
        reliable input.
      </p>
    </div>
  );
}
