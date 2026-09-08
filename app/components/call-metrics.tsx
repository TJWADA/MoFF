import type { CallResult } from "@/lib/backtest";

function pct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function signedClass(n: number | undefined): string {
  if (n == null || Number.isNaN(n) || n === 0) return "text-ink";
  return n > 0 ? "text-up" : "text-danger";
}

export function Pct({ n }: { n: number | undefined }) {
  return (
    <span className={`font-medium tabular-nums ${signedClass(n)}`}>
      {pct(n)}
    </span>
  );
}

function statusLabel(status: CallResult["status"]): string {
  if (status === "completed") return "Completed";
  if (status === "open") return "In progress";
  return "Couldn’t resolve";
}

export function CallMetrics({ result }: { result: CallResult }) {
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
        <>
          <p>
            Absolute <Pct n={result.absoluteReturn} />
            {" · "}
            vs SPY <Pct n={result.excessReturn} />
            {result.status === "completed" && result.hit != null ? (
              <span
                className={`font-medium ${
                  result.hit ? "text-up" : "text-danger"
                }`}
              >
                {` · ${result.hit ? "hit" : "miss"}`}
              </span>
            ) : result.status === "open" ? (
              <span className="text-mute"> · so far</span>
            ) : null}
          </p>
          {result.message ? (
            <p className="text-mute">{result.message}</p>
          ) : null}
        </>
      ) : (
        <p className="text-danger">{result.message}</p>
      )}
    </div>
  );
}
