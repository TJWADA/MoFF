"use client";

import type { ChartPoint } from "@/lib/backtest";

export function BacktestChart({
  series,
  tradeLabel,
  entryDate,
  exitDate,
  exitLabel,
}: {
  series: ChartPoint[];
  tradeLabel: string;
  entryDate?: string;
  exitDate?: string;
  /** e.g. "Exit" or "As of" */
  exitLabel?: string;
}) {
  if (series.length < 2) {
    return (
      <p className="text-sm text-mute">
        Not enough sessions to draw a chart yet.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = series.flatMap((p) => [p.trade, p.spy]);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08;
  const yMax = maxV + span * 0.08;

  const xAt = (i: number) =>
    pad.left + (i / Math.max(series.length - 1, 1)) * innerW;
  const yAt = (v: number) =>
    pad.top + ((yMax - v) / (yMax - yMin)) * innerH;

  const pathFor = (key: "trade" | "spy") =>
    series
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p[key]).toFixed(1)}`)
      .join(" ");

  const entryIdx = entryDate
    ? series.findIndex((p) => p.date === entryDate)
    : 0;
  const exitIdx = exitDate
    ? series.findIndex((p) => p.date === exitDate)
    : series.length - 1;

  const ticks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full border border-line bg-paper"
        role="img"
        aria-label={`${tradeLabel} versus SPY`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="currentColor"
              className="text-line"
              strokeWidth={1}
            />
            <text
              x={pad.left - 6}
              y={yAt(t) + 3}
              textAnchor="end"
              className="fill-mute"
              fontSize={10}
            >
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        <path
          d={pathFor("spy")}
          fill="none"
          stroke="currentColor"
          className="text-mute"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <path
          d={pathFor("trade")}
          fill="none"
          stroke="currentColor"
          className="text-ink"
          strokeWidth={1.75}
        />

        {entryIdx >= 0 ? (
          <line
            x1={xAt(entryIdx)}
            x2={xAt(entryIdx)}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="currentColor"
            className="text-line"
            strokeWidth={1}
          />
        ) : null}
        {exitIdx >= 0 ? (
          <line
            x1={xAt(exitIdx)}
            x2={xAt(exitIdx)}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="currentColor"
            className="text-line"
            strokeWidth={1}
          />
        ) : null}

        <text
          x={pad.left}
          y={height - 8}
          className="fill-mute"
          fontSize={10}
        >
          {series[0].date}
        </text>
        <text
          x={width - pad.right}
          y={height - 8}
          textAnchor="end"
          className="fill-mute"
          fontSize={10}
        >
          {series[series.length - 1].date}
          {exitLabel ? ` · ${exitLabel}` : ""}
        </text>
      </svg>

      <div className="flex flex-wrap gap-4 text-sm text-mute">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-ink" />
          {tradeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 bg-mute"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)",
              backgroundColor: "transparent",
              height: 2,
            }}
          />
          SPY
        </span>
      </div>
    </div>
  );
}
