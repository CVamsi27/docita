import { resolveInternalApiUrl } from "@/lib/api/api-config";

export function formatBytesToMb(value: number): string {
  return `${value} MB`;
}

export function buildPrometheusMetricsUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return null;
  }
  try {
    const parsed = new URL(resolveInternalApiUrl(base));
    parsed.pathname = "/metrics";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return null;
  }
}
