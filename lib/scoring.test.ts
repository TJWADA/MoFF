import { describe, expect, it } from "vitest";
import {
  addDays,
  callExcessReturn,
  excessReturn,
  isHit,
  resolveCall,
  sessionAfter,
  sessionOnOrAfter,
  summarise,
  type Session,
} from "./scoring";

/** Flat benchmark: SPY unchanged at 100 every session. */
const flatBench: Session[] = [
  { date: "2026-01-05", open: 100, close: 100 },
  { date: "2026-01-06", open: 100, close: 100 },
  { date: "2026-02-05", open: 100, close: 100 },
  { date: "2026-02-06", open: 100, close: 100 },
];

describe("addDays", () => {
  it("advances a plain date", () => {
    expect(addDays("2026-01-05", 31)).toBe("2026-02-05");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2025-12-30", 3)).toBe("2026-01-02");
  });
});

describe("session lookup", () => {
  const sessions: Session[] = [
    { date: "2026-01-05", open: 10, close: 11 },
    { date: "2026-01-07", open: 12, close: 13 },
  ];

  it("finds the session on the date itself", () => {
    expect(sessionOnOrAfter(sessions, "2026-01-05")?.date).toBe("2026-01-05");
  });

  it("rolls forward over a non-trading day", () => {
    expect(sessionOnOrAfter(sessions, "2026-01-06")?.date).toBe("2026-01-07");
  });

  it("skips the date itself when looking strictly after", () => {
    expect(sessionAfter(sessions, "2026-01-05")?.date).toBe("2026-01-07");
  });

  it("returns undefined past the end of history", () => {
    expect(sessionOnOrAfter(sessions, "2026-02-01")).toBeUndefined();
  });
});

describe("excessReturn", () => {
  it("is the asset return minus the benchmark return", () => {
    // Asset +20%, benchmark +5% => +15% excess.
    expect(excessReturn(100, 120, 100, 105)).toBeCloseTo(0.15, 10);
  });

  it("is negative when the asset lags a rising benchmark", () => {
    expect(excessReturn(100, 102, 100, 110)).toBeCloseTo(-0.08, 10);
  });

  it("ignores direction entirely", () => {
    expect(excessReturn(100, 90, 100, 100)).toBeCloseTo(-0.1, 10);
  });
});

describe("callExcessReturn", () => {
  it("passes a long through unchanged", () => {
    expect(callExcessReturn("long", 0.15)).toBeCloseTo(0.15, 10);
  });

  it("flips the sign for a short", () => {
    expect(callExcessReturn("short", 0.15)).toBeCloseTo(-0.15, 10);
  });

  it("rewards a short when the name underperforms", () => {
    expect(callExcessReturn("short", -0.2)).toBeCloseTo(0.2, 10);
  });
});

describe("isHit", () => {
  it("counts a long that beat the benchmark", () => {
    expect(isHit("long", 0.05)).toBe(true);
  });

  it("counts a short on a name that lagged", () => {
    expect(isHit("short", -0.05)).toBe(true);
  });

  it("does not count a short on a name that ripped", () => {
    expect(isHit("short", 0.5)).toBe(false);
  });
});

describe("resolveCall", () => {
  const sessions: Session[] = [
    { date: "2026-01-05", open: 100, close: 105 },
    { date: "2026-01-06", open: 106, close: 108 },
    { date: "2026-02-05", open: 130, close: 132 },
    { date: "2026-02-06", open: 133, close: 134 },
  ];

  it("enters at the open of the session after publication", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "long", horizonDays: 31 },
      sessions,
      flatBench,
    );
    // Never 2026-01-05: that session's open is already gone by publish time,
    // and using its close would be look-ahead bias.
    expect(out?.entryDate).toBe("2026-01-06");
    expect(out?.entryPrice).toBe(106);
  });

  it("exits at the close of the first session at or after the horizon", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "long", horizonDays: 31 },
      sessions,
      flatBench,
    );
    expect(out?.exitDate).toBe("2026-02-05");
    expect(out?.exitPrice).toBe(132);
  });

  it("scores a correct long as a hit", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "long", horizonDays: 31 },
      sessions,
      flatBench,
    );
    // 132/106 - 1 = +24.5% against a flat benchmark.
    expect(out?.excessReturn).toBeCloseTo(0.2453, 3);
    expect(out?.hit).toBe(true);
  });

  it("scores the same move as a loss for a short", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "short", horizonDays: 31 },
      sessions,
      flatBench,
    );
    // Regression guard: storing the raw asset excess here would record a badly
    // wrong short as a large positive return.
    expect(out?.excessReturn).toBeCloseTo(-0.2453, 3);
    expect(out?.hit).toBe(false);
  });

  it("returns undefined while the horizon is still running", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "long", horizonDays: 365 },
      sessions,
      flatBench,
    );
    expect(out).toBeUndefined();
  });

  it("returns undefined when no session follows publication", () => {
    const out = resolveCall(
      { publishedOn: "2026-02-06", direction: "long", horizonDays: 1 },
      sessions,
      flatBench,
    );
    expect(out).toBeUndefined();
  });

  it("returns undefined when the benchmark is missing the window", () => {
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "long", horizonDays: 31 },
      sessions,
      [{ date: "2026-01-06", open: 100, close: 100 }],
    );
    expect(out).toBeUndefined();
  });

  it("credits a short when the benchmark outruns the name", () => {
    const laggard: Session[] = [
      { date: "2026-01-05", open: 100, close: 100 },
      { date: "2026-01-06", open: 100, close: 100 },
      { date: "2026-02-05", open: 100, close: 100 },
    ];
    const risingBench: Session[] = [
      { date: "2026-01-06", open: 100, close: 100 },
      { date: "2026-02-05", open: 100, close: 120 },
    ];
    const out = resolveCall(
      { publishedOn: "2026-01-05", direction: "short", horizonDays: 31 },
      laggard,
      risingBench,
    );
    // Flat name, +20% benchmark: the short earns +20% of relative performance.
    expect(out?.excessReturn).toBeCloseTo(0.2, 10);
    expect(out?.hit).toBe(true);
  });
});

describe("summarise", () => {
  it("reports zeros and refuses to rank an empty record", () => {
    expect(summarise([])).toEqual({
      resolved: 0,
      hits: 0,
      hitRate: 0,
      avgExcessReturn: 0,
      ranked: false,
    });
  });

  it("averages excess return and counts hits", () => {
    const s = summarise([
      { excessReturn: 0.1, hit: true },
      { excessReturn: -0.3, hit: false },
    ]);
    expect(s.resolved).toBe(2);
    expect(s.hits).toBe(1);
    expect(s.hitRate).toBeCloseTo(0.5, 10);
    expect(s.avgExcessReturn).toBeCloseTo(-0.1, 10);
  });

  it("withholds a ranking below the sample-size floor", () => {
    const few = summarise(
      Array.from({ length: 4 }, () => ({ excessReturn: 0.5, hit: true })),
    );
    expect(few.ranked).toBe(false);

    const enough = summarise(
      Array.from({ length: 5 }, () => ({ excessReturn: 0.5, hit: true })),
    );
    expect(enough.ranked).toBe(true);
  });
});
