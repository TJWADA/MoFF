"use server";

import {
  fetchChannelVideosPage,
  type ChannelVideo,
} from "@/lib/youtube";

export type LoadMoreVideosResult =
  | { status: "error"; message: string }
  | {
      status: "done";
      videos: ChannelVideo[];
      continuation: string | null;
    };

export async function loadMoreChannelVideos(
  continuation: string,
): Promise<LoadMoreVideosResult> {
  const token = continuation.trim();
  if (!token) {
    return { status: "error", message: "Nothing more to load." };
  }

  try {
    const page = await fetchChannelVideosPage(token);
    return {
      status: "done",
      videos: page.videos,
      continuation: page.continuation,
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Could not load more videos.",
    };
  }
}
