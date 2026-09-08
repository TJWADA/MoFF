"use client";

import { useActionState, useState } from "react";
import {
  analyzeVideo,
  type AnalyzeState,
} from "@/app/actions/analyze-video";
import {
  runBacktest,
  type BacktestState,
} from "@/app/actions/backtest-calls";
import { BacktestChart } from "@/app/components/backtest-chart";
import type { CallResult } from "@/lib/backtest";

const analyzeInitial: AnalyzeState = { status: "idle" };
const backtestInitial: BacktestState = { status: "idle" };

function pct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function statusLabel(status: CallResult["status"]): string {
  if (status === "completed") return "Completed";
  if (status === "open") return "In progress";
  return "Couldn’t resolve";
}

function CallMetrics({ result }: { result: CallResult }) {
  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="font-medium">{statusLabel(result.status)}</span>
        {result.entryDate && result.exitDate ? (
          <span className="text-mute">
            {" "}
            · {result.entryDate} → {result.exitDate}
          </span>
        ) : null}
      </p>
      {result.status !== "unresolved" ? (
        <p className="text-mute">
          Absolute {pct(result.absoluteReturn)}
          {" · "}
          vs SPY {pct(result.excessReturn)}
          {result.status === "completed" && result.hit != null
            ? ` · ${result.hit ? "hit" : "miss"}`
            : result.status === "open"
              ? " · so far"
              : ""}
        </p>
      ) : (
        <p className="text-danger">{result.message}</p>
      )}
    </div>
  );
}

function VideoBookSummary({ results }: { results: CallResult[] }) {
  const scored = results.filter((r) => r.absoluteReturn != null);
  const completed = results.filter((r) => r.status === "completed");
  const open = results.filter((r) => r.status === "open");
  const unresolved = results.filter((r) => r.status === "unresolved");
  const avgAbs =
    scored.length > 0
      ? scored.reduce((s, r) => s + (r.absoluteReturn ?? 0), 0) / scored.length
      : undefined;
  const avgExcess =
    scored.length > 0
      ? scored.reduce((s, r) => s + (r.excessReturn ?? 0), 0) / scored.length
      : undefined;
  const hits = completed.filter((r) => r.hit).length;

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">This video’s recommendations</p>
      <p className="text-mute">
        Avg absolute {pct(avgAbs)} · avg vs SPY {pct(avgExcess)}
        {completed.length > 0
          ? ` · hit rate ${hits}/${completed.length}`
          : ""}
        {open.length > 0 ? ` · ${open.length} still open` : ""}
        {unresolved.length > 0
          ? ` · ${unresolved.length} unresolved`
          : ""}
      </p>
    </div>
  );
}

export function AnalyzeForm({
  videoId,
  publishedAt,
}: {
  videoId: string;
  publishedAt: string;
}) {
  const [analyzeState, analyzeAction, analyzePending] = useActionState(
    analyzeVideo,
    analyzeInitial,
  );
  const [backtestState, backtestAction, backtestPending] = useActionState(
    runBacktest,
    backtestInitial,
  );
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const callsJson =
    analyzeState.status === "done"
      ? JSON.stringify(analyzeState.calls)
      : "[]";

  return (
    <section className="space-y-4 border-t border-line pt-6">
      <div>
        <h2 className="font-medium">Extract trade calls</h2>
        <p className="mt-1 text-sm text-mute">
          Fetch the transcript and pull out actionable long/short calls with
          supporting quotes.
        </p>
      </div>

      <form action={analyzeAction}>
        <input type="hidden" name="videoId" value={videoId} />
        <button
          type="submit"
          disabled={analyzePending}
          className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
        >
          {analyzePending ? "Analyzing…" : "Transcribe & extract trades"}
        </button>
      </form>

      {analyzeState.status === "error" ? (
        <p className="text-sm text-danger">{analyzeState.message}</p>
      ) : null}

      {analyzeState.status === "done" ? (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Model: {analyzeState.model}. {analyzeState.calls.length} call
            {analyzeState.calls.length === 1 ? "" : "s"} found.
            {" · "}Published {publishedAt}
          </p>

          {analyzeState.calls.length === 0 ? (
            <p className="text-sm text-mute">
              No actionable trade calls were found in this video.
            </p>
          ) : (
            <>
              <form action={backtestAction} className="space-y-2">
                <input type="hidden" name="mode" value="video" />
                <input type="hidden" name="publishedAt" value={publishedAt} />
                <input type="hidden" name="calls" value={callsJson} />
                <button
                  type="submit"
                  disabled={backtestPending}
                  onClick={() => setFocusKey(null)}
                  className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
                >
                  {backtestPending && !focusKey
                    ? "Backtesting…"
                    : "Backtest this video"}
                </button>
                <p className="text-sm text-mute">
                  See how this video’s recommendations matured as a book,
                  versus SPY.
                </p>
              </form>

              <ul className="divide-y divide-line border-y border-line">
                {analyzeState.calls.map((call) => {
                  const key = `${call.symbol}-${call.direction}`;
                  const rowResult =
                    backtestState.status === "done" &&
                    (backtestState.mode === "video" ||
                      backtestState.focusKey === key)
                      ? backtestState.results.find(
                          (r) =>
                            r.symbol === call.symbol &&
                            r.direction === call.direction,
                        )
                      : undefined;
                  const showTradePanel =
                    backtestState.status === "done" &&
                    backtestState.mode === "trade" &&
                    backtestState.focusKey === key;

                  return (
                    <li key={key} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-medium">{call.symbol}</span>
                            <span className="text-sm uppercase text-mute">
                              {call.direction}
                            </span>
                            <span className="text-sm text-mute">
                              ~{call.horizonDays}d horizon
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{call.rationale}</p>
                          <blockquote className="mt-2 border-l-2 border-line pl-3 text-sm text-mute">
                            &ldquo;{call.quote}&rdquo;
                          </blockquote>
                        </div>
                        <form action={backtestAction} className="shrink-0">
                          <input type="hidden" name="mode" value="trade" />
                          <input
                            type="hidden"
                            name="publishedAt"
                            value={publishedAt}
                          />
                          <input
                            type="hidden"
                            name="calls"
                            value={JSON.stringify([call])}
                          />
                          <input type="hidden" name="focusKey" value={key} />
                          <button
                            type="submit"
                            disabled={backtestPending}
                            onClick={() => setFocusKey(key)}
                            className="border border-line px-2.5 py-1 text-sm text-mute hover:border-ink hover:text-ink disabled:opacity-50"
                          >
                            {backtestPending && focusKey === key
                              ? "Checking…"
                              : "How did this do?"}
                          </button>
                        </form>
                      </div>

                      {showTradePanel ? (
                        <div className="mt-4 space-y-3 border-t border-line pt-3">
                          {backtestState.results[0] ? (
                            <CallMetrics result={backtestState.results[0]} />
                          ) : null}
                          <BacktestChart
                            series={backtestState.series}
                            tradeLabel={`${call.symbol} ${call.direction}`}
                            entryDate={backtestState.results[0]?.entryDate}
                            exitDate={backtestState.results[0]?.exitDate}
                            exitLabel={
                              backtestState.results[0]?.status === "open"
                                ? "As of"
                                : "Exit"
                            }
                          />
                        </div>
                      ) : null}

                      {backtestState.status === "done" &&
                      backtestState.mode === "video" &&
                      rowResult ? (
                        <div className="mt-3">
                          <CallMetrics result={rowResult} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {backtestState.status === "error" ? (
                <p className="text-sm text-danger">{backtestState.message}</p>
              ) : null}

              {backtestState.status === "done" &&
              backtestState.mode === "video" ? (
                <div className="space-y-3 border-t border-line pt-4">
                  <VideoBookSummary results={backtestState.results} />
                  <BacktestChart
                    series={backtestState.series}
                    tradeLabel="This video"
                    entryDate={backtestState.series[0]?.date}
                    exitDate={
                      backtestState.series[
                        backtestState.series.length - 1
                      ]?.date
                    }
                    exitLabel={
                      backtestState.results.some((r) => r.status === "open")
                        ? "As of"
                        : "Exit"
                    }
                  />
                  {backtestState.results.some(
                    (r) => r.status === "unresolved",
                  ) ? (
                    <ul className="space-y-1 text-sm text-mute">
                      {backtestState.results
                        .filter((r) => r.status === "unresolved")
                        .map((r) => (
                          <li key={`${r.symbol}-${r.direction}`}>
                            {r.symbol}: {r.message}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          <details className="text-sm text-mute">
            <summary className="cursor-pointer hover:text-ink">
              Transcript preview
            </summary>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">
              {analyzeState.transcriptPreview}
            </p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
