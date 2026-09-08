import { envKey } from "./env";

export type BarRow = {
  symbol: string;
  date: string;
  open: number;
  close: number;
};

const DATA_URL = "https://data.alpaca.markets/v2/stocks/bars";

type AlpacaBar = { t: string; o: number; c: number };

function alpacaKeys(): { keyId: string; secretKey: string } | undefined {
  const keyId = envKey("ALPACA_API_KEY_ID");
  const secretKey = envKey("ALPACA_API_SECRET_KEY");
  if (!keyId || !secretKey) return undefined;
  return { keyId, secretKey };
}

/**
 * Daily bars with adjustment=all (splits/dividends baked in).
 * Requires ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY.
 */
export async function fetchBars(
  symbols: string[],
  start: string,
  end: string,
): Promise<BarRow[]> {
  const keys = alpacaKeys();
  if (!keys) {
    throw new Error(
      "ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are required to check how trades did. Add them to .env.local.",
    );
  }

  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const out: BarRow[] = [];

  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    let pageToken: string | undefined;

    do {
      const url = new URL(DATA_URL);
      url.searchParams.set("symbols", chunk.join(","));
      url.searchParams.set("timeframe", "1Day");
      url.searchParams.set("start", start);
      url.searchParams.set("end", end);
      url.searchParams.set("adjustment", "all");
      url.searchParams.set("feed", "iex");
      url.searchParams.set("limit", "10000");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": keys.keyId,
          "APCA-API-SECRET-KEY": keys.secretKey,
        },
      });
      if (!res.ok) {
        throw new Error(`Alpaca bars: HTTP ${res.status} ${await res.text()}`);
      }

      const body = (await res.json()) as {
        bars: Record<string, AlpacaBar[]> | null;
        next_page_token: string | null;
      };

      for (const [symbol, rows] of Object.entries(body.bars ?? {})) {
        for (const b of rows) {
          out.push({
            symbol,
            date: b.t.slice(0, 10),
            open: b.o,
            close: b.c,
          });
        }
      }
      pageToken = body.next_page_token ?? undefined;
    } while (pageToken);
  }

  return out;
}

export function barsBySymbol(
  bars: BarRow[],
): Map<string, { date: string; open: number; close: number }[]> {
  const map = new Map<string, { date: string; open: number; close: number }[]>();
  for (const bar of bars) {
    const list = map.get(bar.symbol) ?? [];
    list.push({ date: bar.date, open: bar.open, close: bar.close });
    map.set(bar.symbol, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }
  return map;
}
