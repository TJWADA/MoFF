import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  /** YouTube channel id, e.g. UCUyDOdBWhC1MCxEjC46d-zw */
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const videos = sqliteTable(
  "videos",
  {
    /** YouTube video id, e.g. dQw4w9WgXcQ */
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    publishedAt: integer("published_at").notNull(),
    isShort: integer("is_short", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("videos_channel_published_idx").on(t.channelId, t.publishedAt)],
);

export const transcripts = sqliteTable("transcripts", {
  videoId: text("video_id")
    .primaryKey()
    .references(() => videos.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  fetchedAt: integer("fetched_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const calls = sqliteTable(
  "calls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    direction: text("direction", { enum: ["long", "short"] }).notNull(),
    conviction: real("conviction").notNull(),
    horizonDays: integer("horizon_days").notNull(),
    rationale: text("rationale").notNull(),
    quote: text("quote").notNull(),
    quoteStartSeconds: integer("quote_start_seconds"),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    // Filled in by the scoring pass. Null until the call's horizon has elapsed
    // and bars exist for both ends of the window.
    entryDate: text("entry_date"),
    entryPrice: real("entry_price"),
    exitDate: text("exit_date"),
    exitPrice: real("exit_price"),
    excessReturn: real("excess_return"),
    hit: integer("hit", { mode: "boolean" }),
    scoredAt: integer("scored_at"),
  },
  (t) => [
    // Makes re-running extraction over the same video idempotent.
    unique("calls_video_symbol_direction_uq").on(
      t.videoId,
      t.symbol,
      t.direction,
    ),
    index("calls_symbol_idx").on(t.symbol),
  ],
);

export const bars = sqliteTable(
  "bars",
  {
    symbol: text("symbol").notNull(),
    /** Session date as YYYY-MM-DD. */
    date: text("date").notNull(),
    open: real("open").notNull(),
    close: real("close").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

export type Channel = typeof channels.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Bar = typeof bars.$inferSelect;
