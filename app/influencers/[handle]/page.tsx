import { notFound } from "next/navigation";
import { pct, toneClass } from "@/lib/format";
import { getChannelByHandle } from "@/lib/queries";
import { MIN_RESOLVED_CALLS } from "@/lib/scoring";
import { CallItem } from "../../components/CallItem";
import { FollowButton } from "../../components/FollowButton";
import {
  Avatar,
  Card,
  Empty,
  Pct,
  SectionHeading,
} from "../../components/ui";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`nums mt-0.5 text-2xl font-semibold ${tone ?? ""}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const data = await getChannelByHandle(decodeURIComponent(handle));
  if (!data) notFound();

  const { channel, stats, calls, best, worst } = data;
  const open = calls.filter((c) => c.excessReturn === null);
  const resolved = calls.filter((c) => c.excessReturn !== null);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-4">
        <Avatar name={channel.name} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {channel.name}
          </h1>
          <p className="text-sm text-ink-500">{channel.handle}</p>
        </div>
        <div className="ml-auto">
          <FollowButton handle={channel.handle} size="md" />
        </div>
      </section>

      <Card className="flex flex-wrap items-start gap-x-12 gap-y-5 p-5">
        <Stat
          label="Avg excess vs SPY"
          value={pct(stats.avgExcessReturn)}
          tone={toneClass(stats.avgExcessReturn)}
          hint="per resolved call"
        />
        <Stat
          label="Hit rate"
          value={`${(stats.hitRate * 100).toFixed(0)}%`}
          hint={`${stats.hits} of ${stats.resolved}`}
        />
        <Stat
          label="Resolved"
          value={String(stats.resolved)}
          hint={
            stats.ranked
              ? "enough history to rank"
              : `needs ${MIN_RESOLVED_CALLS} to rank`
          }
        />
        <Stat label="Open" value={String(open.length)} hint="still running" />
      </Card>

      {best && worst && best.id !== worst.id && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionHeading title="Best call" />
            <Card>
              <CallItem call={best} />
            </Card>
          </div>
          <div>
            <SectionHeading title="Worst call" />
            <Card>
              <CallItem call={worst} />
            </Card>
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section>
          <SectionHeading
            title={`Open calls (${open.length})`}
            hint="Inside their stated horizon, not yet scored."
          />
          <Card className="divide-y divide-ink-800/70">
            {open.map((c) => (
              <CallItem key={c.id} call={c} />
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionHeading
          title={`Resolved calls (${resolved.length})`}
          hint="Entry at the next session open after publishing, exit at the stated horizon."
        />
        {resolved.length ? (
          <Card className="divide-y divide-ink-800/70">
            {resolved.map((c) => (
              <CallItem key={c.id} call={c} />
            ))}
          </Card>
        ) : (
          <Empty>Nothing has resolved for this channel yet.</Empty>
        )}
      </section>
    </div>
  );
}
