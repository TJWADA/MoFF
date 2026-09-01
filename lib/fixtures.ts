import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIR = resolve(process.cwd(), "fixtures");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(DIR, name), "utf8")) as T;
}

export type FixtureChannel = {
  id: string;
  handle: string;
  name: string;
  blurb: string;
  avatarUrl: string | null;
};

export type FixtureVideo = {
  id: string;
  channelId: string;
  title: string;
  publishedAt: string;
  isShort: boolean;
};

export type FixtureCall = {
  symbol: string;
  direction: "long" | "short";
  conviction: number;
  horizonDays: number;
  rationale: string;
  quote: string;
  quoteStartSeconds: number;
};

export type FixtureBar = { date: string; open: number; close: number };

export const fixtureChannels = () => load<FixtureChannel[]>("channels.json");
export const fixtureVideos = () => load<FixtureVideo[]>("videos.json");
export const fixtureTranscripts = () =>
  load<Record<string, { text: string; provider: string }>>("transcripts.json");
export const fixtureCalls = () =>
  load<Record<string, FixtureCall[]>>("calls.json");
export const fixtureBars = () =>
  load<Record<string, FixtureBar[]>>("bars.json");
