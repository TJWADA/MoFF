"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  analyzeVideo,
  type AnalyzeState,
} from "@/app/actions/analyze-video";
import {
  runBacktest,
  type BacktestState,
} from "@/app/actions/backtest-calls";
import { BacktestChart } from "@/app/components/backtest-chart";
import { CallMetrics, Pct } from "@/app/components/call-metrics";
import type { CallResult } from "@/lib/backtest";
import { tradeHref } from "@/lib/call-param";
import { formatCallName } from "@/lib/extract";

const analyzeInitial: AnalyzeState = { status: "idle" };
const backtestInitial: BacktestState = { status: "idle" };

function storageKey(videoId: string) {
  return `moff:analyze:${videoId}`;
}

function readStoredAnalyze(videoId: string): AnalyzeState | null {
  try {
    const raw = sessionStorage.getItem(storageKey(videoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalyzeState;
    return parsed.status === "done" ? parsed : null;
  } catch {
    return null;
  }
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
      <p>
        Avg absolute <Pct n={avgAbs} />
        {" · "}
        avg vs SPY <Pct n={avgExcess} />
        {completed.length > 0 ? (
          <span className="text-mute">
            {` · hit rate ${hits}/${completed.length}`}
          </span>
        ) : null}
        {open.length > 0 ? (
          <span className="text-mute">{` · ${open.length} still open`}</span>
        ) : null}
        {unresolved.length > 0 ? (
          <span className="text-mute">
            {` · ${unresolved.length} unresolved`}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function AnalyzeForm({
  channelId,
  videoId,
  publishedAt,
  searchQuery = "",
}: {
  channelId: string;
  videoId: string;
  publishedAt: string;
  searchQuery?: string;
}) {
  const [analyzeState, analyzeAction, analyzePending] = useActionState(
    analyzeVideo,
    analyzeInitial,
  );
  const [backtestState, backtestAction, backtestPending] = useActionState(
    runBacktest,
    backtestInitial,
  );
  const [storedAnalyze, setStoredAnalyze] = useState<AnalyzeState | null>(
    null,
  );

  useEffect(() => {
    setStoredAnalyze(readStoredAnalyze(videoId));
  }, [videoId]);

  useEffect(() => {
    if (analyzeState.status === "done") {
      sessionStorage.setItem(storageKey(videoId), JSON.stringify(analyzeState));
      setStoredAnalyze(analyzeState);
    }
  }, [analyzeState, videoId]);

  const displayAnalyze =
    analyzeState.status === "idle" && storedAnalyze
      ? storedAnalyze
      : analyzeState;

  const callsJson =
    displayAnalyze.status === "done"
      ? JSON.stringify(displayAnalyze.calls)
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

      {displayAnalyze.status === "done" ? (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Model: {displayAnalyze.model}. {displayAnalyze.calls.length} call
            {displayAnalyze.calls.length === 1 ? "" : "s"} found.
            {" · "}Published {publishedAt}
          </p>

          {displayAnalyze.calls.length === 0 ? (
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
                  className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
                >
                  {backtestPending
                    ? "Checking…"
                    : "How did this video do?"}
                </button>
                <p className="text-sm text-mute">
                  See how this video’s recommendations matured as a book,
                  versus SPY.
                </p>
              </form>

              <ul className="divide-y divide-line border-y border-line">
                {displayAnalyze.calls.map((call) => {
                  const key = `${call.symbol}-${call.direction}`;
                  const rowResult =
                    backtestState.status === "done" &&
                    backtestState.mode === "video"
                      ? backtestState.results.find(
                          (r) =>
                            r.symbol === call.symbol &&
                            r.direction === call.direction,
                        )
                      : undefined;

                  return (
                    <li key={key} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-medium">
                              {formatCallName(call)}
                            </span>
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
                        <Link
                          href={tradeHref({
                            channelId,
                            videoId,
                            call,
                            q: searchQuery,
                          })}
                          className="shrink-0 border border-line px-2.5 py-1 text-sm text-mute hover:border-ink hover:text-ink"
                        >
                          Show Trade
                        </Link>
                      </div>

                      {rowResult ? (
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
              {displayAnalyze.transcriptPreview}
            </p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
