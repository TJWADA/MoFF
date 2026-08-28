/**
 * Seeds the channel watchlist -- who MoFF tracks. Everything downstream
 * (videos, transcripts, calls, prices, scores) is produced by `pnpm pipeline`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { client, db } from "../lib/db";
import { channels } from "../lib/db/schema";
import { MODE } from "../lib/env";
import { fixtureChannels } from "../lib/fixtures";

type Row = { id: string; handle: string; name: string; avatarUrl?: string | null };

const rows: Row[] =
  MODE === "live"
    ? (JSON.parse(
        readFileSync(resolve(process.cwd(), "config/channels.json"), "utf8"),
      ) as Row[])
    : fixtureChannels();

await db
  .insert(channels)
  .values(
    rows.map((r) => ({
      id: r.id,
      handle: r.handle,
      name: r.name,
      avatarUrl: r.avatarUrl ?? null,
    })),
  )
  .onConflictDoNothing();

console.log(`seeded ${rows.length} channels (${MODE} mode)`);
client.close();
