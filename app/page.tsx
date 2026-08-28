import Link from "next/link";
import { marketSentiment } from "@/lib/consensus";
import { pct, relativeDays, toneClass } from "@/lib/format";
import { getConsensus, getRecentlyResolved } from "@/lib/queries";
import { ConsensusCard } from "./components/ConsensusCard";
import {
  Card,
  ChannelLink,
  DirectionBadge,
  Empty,
  Pct,
  SectionHeading,
} from "./components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const consensus = await getConsensus();
  const sentiment = marketSentiment(consensus);
  const resolved = await getRecentlyResolved(8);

  const corroborated = consensus.filter((c) => c.label === "corroborated");
  const contested = consensus.filter((c) => c.label === "contested");
  const thin = consensus.filter((c) => c.label === "mixed");

  const leaning =
    sentiment.score > 0.15
      ? "net bullish"
      : sentiment.score < -0.15
        ? "net bearish"
        : "split";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          Where the finfluencers stand right now
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Every live call extracted from tracked channels, one vote per channel
          per ticker, counted while the call is still inside its stated horizon.
        </p>

        <Card className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4 p-5">
          <div>
            <div className="text-xs text-ink-500">Aggregate lean</div>
            <div
              className={`nums mt-0.5 text-2xl font-semibold ${toneClass(sentiment.score)}`}
            >
              {pct(sentiment.score, 0)}
            </div>
            <div className="mt-0.5 text-xs text-ink-500">{leaning}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">Live stances</div>
            <div className="nums mt-0.5 text-2xl font-semibold">
              <span className="text-bull-500">{sentiment.bulls}</span>
              <span className="text-ink-700"> / </span>
              <span className="text-bear-500">{sentiment.bears}</span>
            </div>
            <div className="mt-0.5 text-xs text-ink-500">bullish / bearish</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">Tickers covered</div>
            <div className="nums mt-0.5 text-2xl font-semibold">
              {consensus.length}
            </div>
            <div className="mt-0.5 text-xs text-ink-500">
              {corroborated.length} agreed · {contested.length} contested
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Contested"
          hint="Channels are close to evenly split. Usually the most interesting thing on the page."
        />
        {contested.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contested.map((c) => (
              <ConsensusCard key={c.symbol} item={c} />
            ))}
          </div>
        ) : (
          <Empty>No ticker is currently split down the middle.</Empty>
        )}
      </section>

      <section>
        <SectionHeading
          title="Corroborated"
          hint="Three or more channels leaning the same way."
        />
        {corroborated.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corroborated.map((c) => (
              <ConsensusCard key={c.symbol} item={c} />
            ))}
          </div>
        ) : (
          <Empty>Nothing has three channels agreeing right now.</Empty>
        )}
      </section>

      {thin.length > 0 && (
        <section>
          <SectionHeading
            title="Thinly covered"
            hint="One or two channels only. Not enough to call it a consensus."
          />
          <Card className="divide-y divide-ink-800/70">
            {thin.map((c) => (
              <div
                key={c.symbol}
                className="flex items-center gap-4 px-4 py-2.5 text-sm"
              >
                <span className="nums w-16 font-medium">{c.symbol}</span>
                <span className="text-xs text-ink-500">
                  <span className="text-bull-500">{c.bulls}</span>
                  {" / "}
                  <span className="text-bear-500">{c.bears}</span>
                </span>
                <span className="ml-auto flex flex-wrap justify-end gap-1.5">
                  {c.stances.slice(0, 3).map((s) => (
                    <Link
                      key={s.channelId}
                      href={`/influencers/${encodeURIComponent(s.channelHandle)}`}
                      className="text-xs text-ink-500 hover:text-ink-300"
                    >
                      {s.channelName}
                    </Link>
                  ))}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionHeading
          title="Recently resolved"
          hint="Calls whose horizon just elapsed, scored against SPY over the same window."
          action={
            <Link
              href="/influencers"
              className="text-xs text-accent-500 hover:underline"
            >
              See all track records
            </Link>
          }
        />
        {resolved.length ? (
          <Card className="divide-y divide-ink-800/70">
            {resolved.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <span className="nums w-14 shrink-0 text-sm font-medium">
                  {c.symbol}
                </span>
                <DirectionBadge direction={c.direction} />
                <div className="min-w-40 flex-1">
                  <ChannelLink
                    name={c.channelName}
                    handle={c.channelHandle}
                    size={24}
                    subtitle={`called ${relativeDays(c.publishedAt)}`}
                  />
                </div>
                <span className="text-xs text-ink-500">
                  {c.horizonDays}d horizon
                </span>
                <span className="w-20 text-right text-sm font-semibold">
                  <Pct value={c.excessReturn ?? 0} />
                </span>
                <span
                  className={`w-14 text-right text-xs font-medium ${
                    c.hit ? "text-bull-500" : "text-bear-500"
                  }`}
                >
                  {c.hit ? "hit" : "miss"}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No calls have resolved yet.</Empty>
        )}
      </section>
    </div>
  );
}
