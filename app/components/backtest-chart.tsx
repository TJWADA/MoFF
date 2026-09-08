"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import {
  scalePrices,
  slicePrices,
  type ChartPoint,
  type ChartRange,
  type ChartUnit,
  type RawPricePoint,
} from "@/lib/backtest";

type Hover = { idx: number; closer: "trade" | "spy" };

const RANGES: { id: ChartRange; label: string }[] = [
  { id: "since", label: "Since video" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "2Y", label: "2Y" },
  { id: "5Y", label: "5Y" },
  { id: "max", label: "Max" },
];

export function BacktestChart({
  series: staticSeries,
  prices,
  tradeLabel,
  entryDate,
  entryPrice,
  exitDate: _exitDate,
  exitLabel = "As of",
  horizonDate,
  entryLabel,
}: {
  series: ChartPoint[];
  /** When set, the chart can change range and units (trade page). */
  prices?: RawPricePoint[];
  tradeLabel: string;
  entryDate?: string;
  entryPrice?: number;
  exitDate?: string;
  /** e.g. "As of" */
  exitLabel?: string;
  /** Spoken hold; drawn when it falls inside the series. */
  horizonDate?: string;
  /** Vertical marker label, e.g. "Call". */
  entryLabel?: string;
}) {
  const interactive = Boolean(prices && prices.length >= 2);
  const [range, setRange] = useState<ChartRange>("since");
  const [unit, setUnit] = useState<ChartUnit>("pct");
  const [hover, setHover] = useState<Hover | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(true);
  }, []);

  const series = useMemo(() => {
    if (!live || !prices || prices.length < 2) return staticSeries;
    const sliced = slicePrices(prices, range, entryDate);
    return scalePrices(sliced, range, unit, entryDate, entryPrice, prices);
  }, [live, prices, range, unit, entryDate, entryPrice, staticSeries]);

  const width = 640;
  const height = 220;
  const pad = {
    top: 16,
    right: 12,
    bottom: 28,
    left: unit === "usd" && interactive ? 52 : 40,
  };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (series.length < 2) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-mute">
          Not enough sessions to draw a chart yet.
        </p>
        {interactive ? (
          <ChartControls
            range={range}
            unit={unit}
            onRange={(next) => {
              setRange(next);
              setHover(null);
            }}
            onUnit={(next) => {
              setUnit(next);
              setHover(null);
            }}
          />
        ) : null}
      </div>
    );
  }

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
    : interactive
      ? -1
      : 0;
  const horizonIdx = horizonDate
    ? series.findIndex((p) => p.date >= horizonDate)
    : -1;

  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  const point = hover ? series[hover.idx] : null;
  const tooltipOnRight = hover ? xAt(hover.idx) < width * 0.55 : true;
  const callNearRight =
    entryIdx >= 0 && xAt(entryIdx) > width - pad.right - 40;

  function readPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    if (
      x < pad.left ||
      x > width - pad.right ||
      y < pad.top ||
      y > height - pad.bottom
    ) {
      setHover(null);
      return;
    }
    const t = (x - pad.left) / innerW;
    const idx = Math.max(
      0,
      Math.min(series.length - 1, Math.round(t * (series.length - 1))),
    );
    const closer =
      Math.abs(y - yAt(series[idx].trade)) <= Math.abs(y - yAt(series[idx].spy))
        ? "trade"
        : "spy";
    setHover({ idx, closer });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full cursor-crosshair border border-line bg-paper"
          role="img"
          aria-label={`${tradeLabel} versus SPY`}
          onPointerMove={readPointer}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={formatTick(t, interactive ? unit : "pct")}>
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
                {formatTick(t, interactive ? unit : "pct")}
              </text>
            </g>
          ))}

          <path
            d={pathFor("spy")}
            fill="none"
            className="stroke-ink"
            strokeWidth={hover?.closer === "spy" ? 2.5 : 1.75}
            strokeDasharray="4 3"
            style={{
              opacity: hover && hover.closer !== "spy" ? 0.45 : 1,
            }}
          />
          <path
            d={pathFor("trade")}
            fill="none"
            className="stroke-ink"
            strokeWidth={hover?.closer === "trade" ? 2.5 : 2}
            style={{
              opacity: hover && hover.closer !== "trade" ? 0.45 : 1,
            }}
          />

          {entryIdx >= 0 ? (
            <g>
              <line
                x1={xAt(entryIdx)}
                x2={xAt(entryIdx)}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="currentColor"
                className="text-line"
                strokeWidth={1}
              />
              {entryLabel ? (
                <text
                  x={xAt(entryIdx) + (callNearRight ? -4 : 4)}
                  y={pad.top + 10}
                  textAnchor={callNearRight ? "end" : "start"}
                  className="fill-mute"
                  fontSize={9}
                >
                  {entryLabel}
                </text>
              ) : null}
            </g>
          ) : null}
          {horizonIdx > 0 && horizonIdx < series.length - 1 ? (
            <g>
              <line
                x1={xAt(horizonIdx)}
                x2={xAt(horizonIdx)}
                y1={pad.top}
                y2={height - pad.bottom}
                className="stroke-mute"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={xAt(horizonIdx) + 4}
                y={pad.top + 10}
                className="fill-mute"
                fontSize={9}
              >
                Recommended
              </text>
            </g>
          ) : null}

          {hover && point ? (
            <g pointerEvents="none">
              <line
                x1={xAt(hover.idx)}
                x2={xAt(hover.idx)}
                y1={pad.top}
                y2={height - pad.bottom}
                className="stroke-mute"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <circle
                cx={xAt(hover.idx)}
                cy={yAt(point.spy)}
                r={hover.closer === "spy" ? 4.5 : 3.5}
                className="fill-paper stroke-ink"
                strokeWidth={2}
                strokeDasharray="2 2"
              />
              <circle
                cx={xAt(hover.idx)}
                cy={yAt(point.trade)}
                r={hover.closer === "trade" ? 4.5 : 3.5}
                className="fill-paper stroke-ink"
                strokeWidth={2}
              />
            </g>
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

        {hover && point ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[9.5rem] border border-line bg-paper px-2.5 py-2 text-xs shadow-sm"
            style={{
              left: `${(xAt(hover.idx) / width) * 100}%`,
              top: `${(pad.top / height) * 100}%`,
              transform: tooltipOnRight
                ? "translate(10px, 4px)"
                : "translate(calc(-100% - 10px), 4px)",
            }}
          >
            <p className="mb-1.5 font-medium text-ink">{point.date}</p>
            <ul className="space-y-1">
              <TooltipRow
                label={tradeLabel}
                value={point.trade}
                active={hover.closer === "trade"}
                unit={interactive ? unit : "pct"}
              />
              <TooltipRow
                label="SPY"
                value={point.spy}
                active={hover.closer === "spy"}
                unit={interactive ? unit : "pct"}
                dashed
              />
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-mute">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-ink" />
          {tradeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-4"
            style={{
              height: 2,
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--color-ink) 0 3px, transparent 3px 6px)",
            }}
          />
          SPY
        </span>
      </div>

      {interactive ? (
        <ChartControls
          range={range}
          unit={unit}
          onRange={(next) => {
            setRange(next);
            setHover(null);
          }}
          onUnit={(next) => {
            setUnit(next);
            setHover(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ChartControls({
  range,
  unit,
  onRange,
  onUnit,
}: {
  range: ChartRange;
  unit: ChartUnit;
  onRange: (range: ChartRange) => void;
  onUnit: (unit: ChartUnit) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRange(r.id)}
            className={
              range === r.id
                ? "font-medium text-ink"
                : "text-mute hover:text-ink"
            }
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => onUnit("pct")}
          className={
            unit === "pct" ? "font-medium text-ink" : "text-mute hover:text-ink"
          }
        >
          %
        </button>
        <button
          type="button"
          onClick={() => onUnit("usd")}
          className={
            unit === "usd" ? "font-medium text-ink" : "text-mute hover:text-ink"
          }
        >
          $
        </button>
      </div>
    </div>
  );
}

function formatTick(n: number, unit: ChartUnit): string {
  if (unit === "pct") return n.toFixed(0);
  const abs = Math.abs(n);
  if (abs >= 100) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

function formatValue(n: number, unit: ChartUnit): string {
  if (unit === "pct") return n.toFixed(1);
  return `$${n.toFixed(2)}`;
}

function TooltipRow({
  label,
  value,
  active,
  dashed,
  unit,
}: {
  label: string;
  value: number;
  active: boolean;
  dashed?: boolean;
  unit: ChartUnit;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-4 ${
        active ? "text-ink" : "text-mute"
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span
          className="inline-block h-0.5 w-3 shrink-0 bg-ink"
          style={
            dashed
              ? {
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--color-ink) 0 2px, transparent 2px 4px)",
                  backgroundColor: "transparent",
                }
              : undefined
          }
        />
        <span className={active ? "font-medium" : undefined}>{label}</span>
      </span>
      <span className="font-mono tabular-nums">{formatValue(value, unit)}</span>
    </li>
  );
}
