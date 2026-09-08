/** Returns the env var when set and non-empty. */
export function envKey(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}
