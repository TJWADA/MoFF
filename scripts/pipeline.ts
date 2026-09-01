/**
 * The whole MoFF pipeline, one stage at a time:
 *
 *   pnpm pipeline              run every stage in order
 *   pnpm pipeline extract      run a single stage
 *
 * Every stage is idempotent and skips work that is already done, so re-running
 * is cheap and safe. In production this is one cron entry.
 */
import { client } from "../lib/db";
import { MODE } from "../lib/env";
import { runStage, STAGE_NAMES, type StageName } from "../lib/pipeline";

const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const stages = (requested.length ? requested : STAGE_NAMES) as StageName[];

for (const name of stages) {
  if (!STAGE_NAMES.includes(name)) {
    console.error(
      `unknown stage "${name}" (expected one of: ${STAGE_NAMES.join(", ")})`,
    );
    process.exit(1);
  }
}

console.log(`MoFF pipeline (${MODE} mode)\n`);

for (const name of stages) {
  const started = Date.now();
  const summary = await runStage(name);
  console.log(`${name.padEnd(10)} ${summary} (${Date.now() - started}ms)`);
}

client.close();
