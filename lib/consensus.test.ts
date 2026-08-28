import { describe, expect, it } from "vitest";
import {
  buildConsensus,
  classify,
  consensusFor,
  dedupeByChannel,
  isActive,
  marketSentiment,
  type Stance,
} from "./consensus";

const DAY = 86_400_000;
const NOW = Date.parse("2026-08-28T00:00:00Z");

function stance(
  channelId: string,
  direction: "long" | "short",
  daysAgo = 1,
): Stance {
  return {
    channelId,
    channelName: `Channel ${channelId}`,
    channelHandle: `@${channelId}`,
    direction,
    conviction: 0.5,
    videoId: `v-${channelId}-${daysAgo}`,
    videoTitle: "title",
    publishedAt: NOW - daysAgo * DAY,
    quote: "quote",
    quoteStartSeconds: 30,
    horizonDays: 90,
  };
}

describe("isActive", () => {
  it("keeps a call inside its horizon", () => {
    expect(isActive(NOW - 10 * DAY, 90, NOW)).toBe(true);
  });

  it("drops a call once the horizon has elapsed", () => {
    expect(isActive(NOW - 91 * DAY, 90, NOW)).toBe(false);
  });

  it("treats the final day as still active", () => {
    expect(isActive(NOW - 90 * DAY, 90, NOW)).toBe(true);
  });
});

describe("dedupeByChannel", () => {
  it("keeps only a channel's most recent stance", () => {
    const out = dedupeByChannel([
      stance("a", "long", 30),
      stance("a", "short", 2),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].direction).toBe("short");
  });

  it("stops one repetitive channel from outvoting several others", () => {
    // Without deduping this would read 3 bullish vs 2 bearish.
    const out = dedupeByChannel([
      stance("loud", "long", 9),
      stance("loud", "long", 8),
      stance("loud", "long", 7),
      stance("b", "short", 5),
      stance("c", "short", 4),
    ]);
    expect(out).toHaveLength(3);
    expect(out.filter((s) => s.direction === "long")).toHaveLength(1);
  });

  it("orders the survivors newest first", () => {
    const out = dedupeByChannel([
      stance("a", "long", 10),
      stance("b", "long", 2),
      stance("c", "long", 6),
    ]);
    expect(out.map((s) => s.channelId)).toEqual(["b", "c", "a"]);
  });
});

describe("classify", () => {
  it("calls three channels leaning one way corroborated", () => {
    expect(classify(3, 0, 1)).toBe("corroborated");
  });

  it("calls an even split contested", () => {
    expect(classify(2, 2, 0)).toBe("contested");
  });

  it("prefers corroborated when a lopsided split also has two dissenters", () => {
    // Both rules fire at 8 vs 2: it clears the "2 on each side" bar but 80% of
    // channels agree, so it is agreement rather than a split.
    expect(classify(8, 2, (8 - 2) / 10)).toBe("corroborated");
  });

  it("still calls a 5-2 lean contested", () => {
    // 71% agreement is short of the 80% the 0.6 threshold demands, and two
    // channels are actively arguing the other way.
    expect(classify(5, 2, (5 - 2) / 7)).toBe("contested");
  });

  it("calls a near-even split contested even with many voices", () => {
    expect(classify(4, 3, (4 - 3) / 7)).toBe("contested");
  });

  it("will not call thin coverage a consensus", () => {
    expect(classify(1, 0, 1)).toBe("mixed");
    expect(classify(2, 0, 1)).toBe("mixed");
    expect(classify(1, 1, 0)).toBe("mixed");
  });
});

describe("consensusFor", () => {
  it("scores unanimity at the extremes", () => {
    const bullish = consensusFor("PLTR", [
      stance("a", "long"),
      stance("b", "long"),
      stance("c", "long"),
    ]);
    expect(bullish.score).toBe(1);
    expect(bullish.label).toBe("corroborated");

    const bearish = consensusFor("COIN", [
      stance("a", "short"),
      stance("b", "short"),
      stance("c", "short"),
    ]);
    expect(bearish.score).toBe(-1);
    expect(bearish.label).toBe("corroborated");
  });

  it("scores a dead-even split at zero", () => {
    const out = consensusFor("NVDA", [
      stance("a", "long"),
      stance("b", "long"),
      stance("c", "short"),
      stance("d", "short"),
    ]);
    expect(out.score).toBe(0);
    expect(out.bulls).toBe(2);
    expect(out.bears).toBe(2);
    expect(out.label).toBe("contested");
  });

  it("counts channels rather than calls", () => {
    const out = consensusFor("TSLA", [
      stance("a", "long", 5),
      stance("a", "long", 4),
      stance("a", "long", 3),
      stance("b", "short", 2),
    ]);
    expect(out.channels).toBe(2);
    expect(out.bulls).toBe(1);
    expect(out.bears).toBe(1);
    expect(out.score).toBe(0);
  });

  it("handles having no stances at all", () => {
    const out = consensusFor("XYZ", []);
    expect(out.score).toBe(0);
    expect(out.channels).toBe(0);
    expect(out.label).toBe("mixed");
  });
});

describe("buildConsensus", () => {
  it("puts the most widely covered tickers first", () => {
    const out = buildConsensus(
      new Map([
        ["THIN", [stance("a", "long")]],
        [
          "WIDE",
          [stance("a", "long"), stance("b", "long"), stance("c", "short")],
        ],
      ]),
    );
    expect(out.map((c) => c.symbol)).toEqual(["WIDE", "THIN"]);
  });
});

describe("marketSentiment", () => {
  it("nets bullish and bearish stances across every ticker", () => {
    const out = marketSentiment(
      buildConsensus(
        new Map([
          ["A", [stance("a", "long"), stance("b", "long")]],
          ["B", [stance("c", "short")]],
        ]),
      ),
    );
    expect(out.bulls).toBe(2);
    expect(out.bears).toBe(1);
    expect(out.score).toBeCloseTo(1 / 3, 10);
  });

  it("is neutral with nothing to aggregate", () => {
    expect(marketSentiment([])).toEqual({ score: 0, bulls: 0, bears: 0 });
  });
});
