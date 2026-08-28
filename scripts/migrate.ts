import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db } from "../lib/db";

const url = process.env.DATABASE_URL ?? "file:.moff/moff.db";
if (url.startsWith("file:")) {
  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

await migrate(db, { migrationsFolder: "./drizzle" });
client.close();
console.log("migrations applied");
