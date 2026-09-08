"use server";

import { extractCalls, type ExtractedCall } from "@/lib/extract";
import { fetchTranscript } from "@/lib/transcripts";

export type AnalyzeState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      transcriptPreview: string;
      calls: ExtractedCall[];
      model: string;
    };

export async function analyzeVideo(
  _prev: AnalyzeState,
  formData: FormData,
): Promise<AnalyzeState> {
  const videoId = String(formData.get("videoId") ?? "").trim();
  if (!videoId) {
    return { status: "error", message: "Missing video id." };
  }

  try {
    const { text } = await fetchTranscript(videoId);
    const { calls, model } = await extractCalls(text);
    return {
      status: "done",
      transcriptPreview:
        text.length > 500 ? `${text.slice(0, 500)}…` : text,
      calls,
      model,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Analysis failed.",
    };
  }
}
