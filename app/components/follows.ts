"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "moff:follows";

const listeners = new Set<() => void>();
/**
 * useSyncExternalStore compares snapshots by reference, so the parsed array has
 * to be cached and only replaced when it actually changes -- returning a fresh
 * array each read would loop forever.
 */
let cache: string[] | null = null;
const EMPTY: string[] = [];

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: following just will not persist.
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFollows() {
  const follows = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((handle: string) => {
    const current = read();
    write(
      current.includes(handle)
        ? current.filter((h) => h !== handle)
        : [...current, handle],
    );
  }, []);

  const isFollowing = useCallback(
    (handle: string) => follows.includes(handle),
    [follows],
  );

  return { follows, toggle, isFollowing };
}
