const DEFAULT_API_URL =
  process.env.DOCITA_CLOUDFLARE === "1"
    ? "/api/v1"
    : "http://127.0.0.1:3001/api/v1";
const DEFAULT_MAIN_APP_URL =
  process.env.DOCITA_CLOUDFLARE === "1"
    ? "https://app.docita.work"
    : "http://127.0.0.1:3000";

export function resolveInternalApiUrl(value: string, origin?: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  const runtimeOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!runtimeOrigin) return value;

  return new URL(value, runtimeOrigin).toString().replace(/\/$/, "");
}

export const API_URL = resolveInternalApiUrl(
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
);

export const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || DEFAULT_MAIN_APP_URL;
