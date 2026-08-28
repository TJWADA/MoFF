import { alpacaKeys } from "./env";

const PAPER_URL = "https://paper-api.alpaca.markets";

export type Position = { symbol: string; qty: number; marketValue: number };

export type Account = {
  equity: number;
  cash: number;
  buyingPower: number;
  status: string;
};

export type OrderResult =
  | { symbol: string; ok: true; id: string; notional: number }
  | { symbol: string; ok: false; error: string };

function headers(keys: { keyId: string; secretKey: string }) {
  return {
    "APCA-API-KEY-ID": keys.keyId,
    "APCA-API-SECRET-KEY": keys.secretKey,
    "Content-Type": "application/json",
  };
}

/**
 * The one place MoFF talks to a real broker. Per-influencer books are plain
 * bookkeeping over price history -- Alpaca allows only three paper accounts per
 * login, and its paper engine ignores dividends -- so this single account
 * exists to trade the consensus itself.
 */
export class PaperBroker {
  private constructor(
    private readonly keys: { keyId: string; secretKey: string },
  ) {}

  static create(): PaperBroker | undefined {
    const keys = alpacaKeys();
    return keys ? new PaperBroker(keys) : undefined;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${PAPER_URL}${path}`, {
      ...init,
      headers: headers(this.keys),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async account(): Promise<Account> {
    const a = await this.request<{
      equity: string;
      cash: string;
      buying_power: string;
      status: string;
    }>("/v2/account");
    return {
      equity: Number(a.equity),
      cash: Number(a.cash),
      buyingPower: Number(a.buying_power),
      status: a.status,
    };
  }

  async positions(): Promise<Position[]> {
    const rows = await this.request<
      { symbol: string; qty: string; market_value: string }[]
    >("/v2/positions");
    return rows.map((p) => ({
      symbol: p.symbol,
      qty: Number(p.qty),
      marketValue: Number(p.market_value),
    }));
  }

  /** Notional market order. Fractional shares are enabled on paper by default. */
  async buy(symbol: string, notional: number): Promise<OrderResult> {
    try {
      const order = await this.request<{ id: string }>("/v2/orders", {
        method: "POST",
        body: JSON.stringify({
          symbol,
          notional: notional.toFixed(2),
          side: "buy",
          type: "market",
          time_in_force: "day",
        }),
      });
      return { symbol, ok: true, id: order.id, notional };
    } catch (err) {
      return { symbol, ok: false, error: (err as Error).message };
    }
  }
}
