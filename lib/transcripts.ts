import { envKey } from "./env";

export type FetchedTranscript = { text: string; provider: string };

export async function fetchTranscript(
  videoId: string,
): Promise<FetchedTranscript> {
  const key = envKey("SUPADATA_API_KEY");
  if (!key) {
    throw new Error(
      "SUPADATA_API_KEY is not set. Add it to .env.local to fetch transcripts.",
    );
  }

  const url = new URL("https://api.supadata.ai/v1/youtube/transcript");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("text", "true");

  const res = await fetch(url, { headers: { "x-api-key": key } });
  if (!res.ok) {
    throw new Error(`Transcript API returned HTTP ${res.status}`);
  }

  const body = (await res.json()) as { content?: string };
  const text = body.content?.trim();
  if (!text) {
    throw new Error("No transcript text returned for this video.");
  }

  return { text, provider: "supadata" };
}
