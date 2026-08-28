"use client";

import { useFollows } from "./follows";

export function FollowButton({
  handle,
  size = "sm",
}: {
  handle: string;
  size?: "sm" | "md";
}) {
  const { isFollowing, toggle } = useFollows();
  const following = isFollowing(handle);

  return (
    <button
      type="button"
      onClick={() => toggle(handle)}
      aria-pressed={following}
      className={`shrink-0 rounded-md border font-medium transition-colors ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
      } ${
        following
          ? "border-ink-700 bg-ink-800 text-ink-300 hover:border-bear-700 hover:text-bear-500"
          : "border-accent-500/40 bg-accent-500/10 text-accent-500 hover:bg-accent-500/20"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
