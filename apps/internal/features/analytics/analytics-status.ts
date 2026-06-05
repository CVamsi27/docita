export function buildAnalyticsParams(
  period: string,
  startDate: string,
  endDate: string,
): string {
  const params = new URLSearchParams({ period });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return params.toString();
}

export function computePageStatus(
  token: string | null,
  loading: boolean,
  hasData: boolean,
  error: unknown,
): "loading" | "error" | "success" {
  if (!token || (loading && !hasData)) return "loading";
  if (error) return "error";
  return "success";
}

export const ANALYTICS_LOAD_ERROR_FALLBACK =
  "We could not load this analytics view. Please try again.";
export const ANALYTICS_EXPORT_ERROR =
  "We could not export the report. Please try again.";
