import { liveKey } from "./env";
import { fixtureTranscripts } from "./fixtures";

export type FetchedTranscript = { text: string; provider: string };

/**
 * Scraping transcripts from a datacenter IP largely does not work any more --
 * YouTube gates subtitle requests behind PO Tokens, and yt-dlp, youtubei.js and
 * youtube-transcript-api all fail or are unreliable from cloud hosts. So the
 * live path buys them. Transcripts never change, so a video is fetched at most
 * once and cached in the database forever.
 */
export async function fetchTranscript(
  videoId: string,
): Promise<FetchedTranscript | undefined> {
  const key = liveKey("SUPADATA_API_KEY");

  if (key) {
    try {
      const url = new URL("https://api.supadata.ai/v1/youtube/transcript");
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("text", "true");

      const res = await fetch(url, { headers: { "x-api-key": key } });
      if (res.ok) {
        const body = (await res.json()) as { content?: string };
        if (body.content?.trim()) {
          return { text: body.content, provider: "supadata" };
        }
      } else {
        console.warn(`  transcript ${videoId}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`  transcript ${videoId}: ${(err as Error).message}`);
    }
  }

  const fixture = fixtureTranscripts()[videoId];
  return fixture ? { text: fixture.text, provider: fixture.provider } : undefined;
}
