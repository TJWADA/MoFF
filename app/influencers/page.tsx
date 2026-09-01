import { MIN_RESOLVED_CALLS } from "@/lib/scoring";
import { getLeaderboard } from "@/lib/queries";
import { FollowButton } from "../components/FollowButton";
import { Card, ChannelLink, Empty, Pct, SectionHeading } from "../components/ui";

export const dynamic = "force-dynamic";

export default async function Influencers() {
  const rows = await getLeaderboard();
  const ranked = rows.filter((r) => r.ranked);
  const unranked = rows.filter((r) => !r.ranked);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Influencers</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Ranked by average excess return against SPY across every resolved
          call. Sample size is shown for all of them, because a good-looking hit
          rate over a handful of calls means very little.
        </p>
      </section>

      {ranked.length ? (
        <Card>
          <div className="hidden grid-cols-[1fr_5rem_5rem_5rem_5rem_5.5rem] gap-3 border-b border-ink-800/70 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-500 sm:grid">
            <span>Channel</span>
            <span className="text-right">Avg excess</span>
            <span className="text-right">Hit rate</span>
            <span className="text-right">Resolved</span>
            <span className="text-right">Open</span>
            <span />
          </div>
          <div className="divide-y divide-ink-800/70">
            {ranked.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_5rem_5rem_5rem_5rem_5.5rem]"
              >
                <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                  <span className="nums w-5 shrink-0 text-xs text-ink-700">
                    {i + 1}
                  </span>
                  <ChannelLink name={r.name} handle={r.handle} size={32} />
                </div>
                <span className="text-right text-sm font-semibold sm:text-base">
                  <Pct value={r.avgExcessReturn} />
                </span>
                <span className="nums text-right text-sm text-ink-300">
                  {(r.hitRate * 100).toFixed(0)}%
                </span>
                <span className="nums text-right text-sm text-ink-500">
                  {r.resolved}
                </span>
                <span className="nums text-right text-sm text-ink-500">
                  {r.open}
                </span>
                <span className="flex justify-end">
                  <FollowButton handle={r.handle} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Empty>
          No channel has {MIN_RESOLVED_CALLS} resolved calls yet. Run{" "}
          <code className="text-ink-300">pnpm pipeline</code> to score some.
        </Empty>
      )}

      {unranked.length > 0 && (
        <section>
          <SectionHeading
            title="Not yet ranked"
            hint={`Fewer than ${MIN_RESOLVED_CALLS} resolved calls, so there is not enough history to say anything.`}
          />
          <Card className="divide-y divide-ink-800/70">
            {unranked.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <ChannelLink name={r.name} handle={r.handle} size={32} />
                <span className="ml-auto text-xs text-ink-500">
                  {r.resolved} resolved · {r.open} open
                </span>
                <FollowButton handle={r.handle} />
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
