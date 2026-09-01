import { alpacaKeys } from "./env";
import { fixtureBars } from "./fixtures";

export type BarRow = { symbol: string; date: string; open: number; close: number };

const DATA_URL = "https://data.alpaca.markets/v2/stocks/bars";

type AlpacaBar = { t: string; o: number; c: number };

/**
 * Daily bars with adjustment=all, so splits and dividends are already baked in
 * -- that is the main reason performance is computed from market data rather
 * than from a broker account, since Alpaca's paper engine ignores dividends.
 *
 * The free Basic plan serves full-coverage SIP history back to 2016 provided
 * `end` is at least 15 minutes old, which daily bars always are.
 */
async function fetchAlpacaBars(
  symbols: string[],
  start: string,
  end: string,
  keys: { keyId: string; secretKey: string },
): Promise<BarRow[]> {
  const out: BarRow[] = [];

  // Alpaca accepts multi-symbol requests but the limit applies to total data
  // points across all symbols, so chunk conservatively and page each chunk.
  for (let i = 0; i < symbols.length; i += 20) {
    const chunk = symbols.slice(i, i + 20);
    let pageToken: string | undefined;

    do {
      const url = new URL(DATA_URL);
      url.searchParams.set("symbols", chunk.join(","));
      url.searchParams.set("timeframe", "1Day");
      url.searchParams.set("start", start);
      url.searchParams.set("end", end);
      url.searchParams.set("adjustment", "all");
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

export async function fetchBars(
  symbols: string[],
  start: string,
  end: string,
): Promise<BarRow[]> {
  const keys = alpacaKeys();

  if (keys) {
    try {
      return await fetchAlpacaBars(symbols, start, end, keys);
    } catch (err) {
      console.warn(`  prices: ${(err as Error).message}`);
    }
  }

  const fixtures = fixtureBars();
  const out: BarRow[] = [];
  for (const symbol of symbols) {
    for (const b of fixtures[symbol] ?? []) {
      if (b.date >= start && b.date <= end) {
        out.push({ symbol, date: b.date, open: b.open, close: b.close });
      }
    }
  }
  return out;
}
