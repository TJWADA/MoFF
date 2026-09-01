/**
 * MoFF runs against checked-in fixtures unless MOFF_MODE=live. Even in live
 * mode each stage independently falls back to fixtures when its own key is
 * absent, so you can turn the pipeline on one provider at a time.
 */
export const MODE: "fixture" | "live" =
  process.env.MOFF_MODE === "live" ? "live" : "fixture";

/** Returns the env var only when running live and it is actually set. */
export function liveKey(name: string): string | undefined {
  if (MODE !== "live") return undefined;
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function alpacaKeys():
  | { keyId: string; secretKey: string }
  | undefined {
  const keyId = liveKey("ALPACA_API_KEY_ID");
  const secretKey = liveKey("ALPACA_API_SECRET_KEY");
  return keyId && secretKey ? { keyId, secretKey } : undefined;
}
