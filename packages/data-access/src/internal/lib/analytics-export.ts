import { buildURL } from "../../lib/request-helpers";

export type InternalAnalyticsExportParams = {
  period: "daily" | "weekly" | "monthly";
  startDate?: string;
  endDate?: string;
};

export async function downloadInternalAnalyticsExport(
  baseURL: string,
  authHeaders: HeadersInit,
  params: InternalAnalyticsExportParams,
): Promise<Blob> {
  const search = new URLSearchParams({
    period: params.period,
    format: "pdf",
  });
  if (params.startDate) {
    search.append("startDate", params.startDate);
  }
  if (params.endDate) {
    search.append("endDate", params.endDate);
  }

  const url = buildURL(
    baseURL,
    `internal/analytics/export?${search.toString()}`,
  );
  const response = await fetch(url, { headers: authHeaders });

  if (!response.ok) {
    throw new Error(`Analytics export failed (${response.status})`);
  }

  return response.blob();
}
