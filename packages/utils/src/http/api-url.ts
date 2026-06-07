export function resolveApiUrl(value: string, origin?: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  const runtimeOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!runtimeOrigin) return value;

  return new URL(value, runtimeOrigin).toString().replace(/\/$/, "");
}
