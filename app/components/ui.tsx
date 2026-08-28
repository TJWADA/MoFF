import Link from "next/link";
import { avatarHue, initials, pct, toneClass } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-800/80 bg-ink-900/50 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink-100">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pct({
  value,
  digits = 1,
  className = "",
}: {
  value: number;
  digits?: number;
  className?: string;
}) {
  return (
    <span className={`nums ${toneClass(value)} ${className}`}>
      {pct(value, digits)}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: "long" | "short" }) {
  const long = direction === "long";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        long
          ? "bg-bull-700/25 text-bull-500"
          : "bg-bear-700/25 text-bear-500"
      }`}
    >
      {long ? "▲" : "▼"} {direction}
    </span>
  );
}

const LABEL_STYLE: Record<string, string> = {
  corroborated: "bg-accent-500/15 text-accent-500 border-accent-500/30",
  contested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  mixed: "bg-ink-800/60 text-ink-500 border-ink-700/60",
};

export function ConsensusLabel({ label }: { label: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        LABEL_STYLE[label] ?? LABEL_STYLE.mixed
      }`}
    >
      {label}
    </span>
  );
}

export function Avatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const hue = avatarHue(name);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-ink-950"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, oklch(0.78 0.13 ${hue}), oklch(0.62 0.15 ${(hue + 55) % 360}))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function ChannelLink({
  name,
  handle,
  size = 28,
  subtitle,
}: {
  name: string;
  handle: string;
  size?: number;
  subtitle?: string;
}) {
  return (
    <Link
      href={`/influencers/${encodeURIComponent(handle)}`}
      className="group flex min-w-0 items-center gap-2.5"
    >
      <Avatar name={name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink-100 group-hover:text-white">
          {name}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {subtitle ?? handle}
        </span>
      </span>
    </Link>
  );
}

/**
 * Horizontal bull/bear split. Widths are the share of channels on each side,
 * so the bar reads as "how lopsided is this".
 */
export function SplitBar({ bulls, bears }: { bulls: number; bears: number }) {
  const total = Math.max(bulls + bears, 1);
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-ink-800">
      <div
        className="bg-bull-500"
        style={{ width: `${(bulls / total) * 100}%` }}
      />
      <div
        className="bg-bear-500"
        style={{ width: `${(bears / total) * 100}%` }}
      />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-8 text-center text-sm text-ink-500">{children}</Card>
  );
}
