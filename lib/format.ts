export function pct(value: number, digits = 1): string {
  const n = value * 100;
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function toneClass(value: number): string {
  if (value > 0) return "text-bull-500";
  if (value < 0) return "text-bear-500";
  return "text-ink-500";
}

export function shortDate(input: number | string): string {
  const d = typeof input === "number" ? new Date(input) : new Date(`${input}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function relativeDays(epochMs: number, now = Date.now()): string {
  const days = Math.round((now - epochMs) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function youtubeUrl(videoId: string, atSeconds?: number | null): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  return atSeconds ? `${base}&t=${atSeconds}s` : base;
}

export function timecode(seconds: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Deterministic hue per channel so avatars are stable across renders. */
export function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
