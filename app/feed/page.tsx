import { getAllChannels, getRecentCalls } from "@/lib/queries";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

export default async function Feed() {
  const [calls, channels] = await Promise.all([
    getRecentCalls(60),
    getAllChannels(),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">My feed</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Recent videos from the channels you follow and the calls extracted
          from them. Follows are kept in this browser only, so there is no
          account to create.
        </p>
      </section>

      <FeedClient
        calls={calls}
        channels={channels.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
        }))}
      />
    </div>
  );
}
