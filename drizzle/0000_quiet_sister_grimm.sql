CREATE TABLE `bars` (
	`symbol` text NOT NULL,
	`date` text NOT NULL,
	`open` real NOT NULL,
	`close` real NOT NULL,
	PRIMARY KEY(`symbol`, `date`)
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` text NOT NULL,
	`symbol` text NOT NULL,
	`direction` text NOT NULL,
	`conviction` real NOT NULL,
	`horizon_days` integer NOT NULL,
	`rationale` text NOT NULL,
	`quote` text NOT NULL,
	`quote_start_seconds` integer,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`entry_date` text,
	`entry_price` real,
	`exit_date` text,
	`exit_price` real,
	`excess_return` real,
	`hit` integer,
	`scored_at` integer,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calls_symbol_idx` ON `calls` (`symbol`);--> statement-breakpoint
CREATE UNIQUE INDEX `calls_video_symbol_direction_uq` ON `calls` (`video_id`,`symbol`,`direction`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_handle_unique` ON `channels` (`handle`);--> statement-breakpoint
CREATE TABLE `transcripts` (
	`video_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`provider` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`published_at` integer NOT NULL,
	`is_short` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `videos_channel_published_idx` ON `videos` (`channel_id`,`published_at`);