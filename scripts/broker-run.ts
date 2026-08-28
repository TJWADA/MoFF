/**
 * Trades the consensus on a single real Alpaca paper account.
 *
 *   pnpm broker              dry run: print what it would buy
 *   pnpm broker --execute    actually place the orders
 *
 * Buys a fixed notional of every corroborated-bullish ticker not already held.
 * There is no sell side and no rebalancing: this is the smallest thing that
 * puts the mixture into a real broker account, not a portfolio manager.
 */
import { client } from "../lib/db";
import { PaperBroker } from "../lib/broker";
import { MODE } from "../lib/env";
import { getConsensus } from "../lib/queries";

const NOTIONAL_PER_POSITION = 1000;

const execute = process.argv.includes("--execute");

const consensus = await getConsensus();
const targets = consensus.filter(
  (c) => c.label === "corroborated" && c.score > 0,
);

console.log(`MoFF consensus fund (${MODE} mode)\n`);

if (targets.length === 0) {
  console.log("No corroborated bullish tickers right now. Nothing to do.");
  client.close();
  process.exit(0);
}

console.log("Corroborated bullish:");
for (const t of targets) {
  console.log(
    `  ${t.symbol.padEnd(6)} ${t.bulls}L/${t.bears}S across ${t.channels} channels (score ${t.score.toFixed(2)})`,
  );
}

const broker = PaperBroker.create();

if (!broker) {
  console.log(
    "\nNo Alpaca credentials, so this is a preview only.\n" +
      "Set MOFF_MODE=live plus ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY to trade.",
  );
  console.log(
    `\nWould buy $${NOTIONAL_PER_POSITION} of: ${targets.map((t) => t.symbol).join(", ")}`,
  );
  client.close();
  process.exit(0);
}

const account = await broker.account();
const held = new Set((await broker.positions()).map((p) => p.symbol));

console.log(
  `\nAccount: ${account.status}, equity $${account.equity.toFixed(2)}, ` +
    `buying power $${account.buyingPower.toFixed(2)}`,
);
console.log(`Already held: ${held.size ? [...held].join(", ") : "nothing"}`);

const toBuy = targets.filter((t) => !held.has(t.symbol));
if (toBuy.length === 0) {
  console.log("\nEvery corroborated bullish ticker is already held.");
  client.close();
  process.exit(0);
}

const cost = toBuy.length * NOTIONAL_PER_POSITION;
console.log(
  `\n${execute ? "Buying" : "Would buy"} $${NOTIONAL_PER_POSITION} each of ` +
    `${toBuy.map((t) => t.symbol).join(", ")} ($${cost} total)`,
);

if (!execute) {
  console.log("\nDry run. Re-run with --execute to place these orders.");
  client.close();
  process.exit(0);
}

if (cost > account.buyingPower) {
  console.error(
    `\nRefusing to trade: $${cost} needed, $${account.buyingPower.toFixed(2)} available.`,
  );
  client.close();
  process.exit(1);
}

for (const t of toBuy) {
  const result = await broker.buy(t.symbol, NOTIONAL_PER_POSITION);
  console.log(
    result.ok
      ? `  ${t.symbol.padEnd(6)} ordered (${result.id})`
      : `  ${t.symbol.padEnd(6)} FAILED: ${result.error}`,
  );
}

client.close();
