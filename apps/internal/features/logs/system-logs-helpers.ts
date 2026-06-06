import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";

export const EMPTY_LOGS: SystemLog[] = [];

export function parseLogLimit(
  value: string | null,
  fallback: 25 | 50 | 100,
): 25 | 50 | 100 {
  if (value === "25") return 25;
  if (value === "50") return 50;
  if (value === "100") return 100;
  return fallback;
}

export function parseLogLevel(
  value: string | null,
): "ALL" | SystemLog["level"] {
  if (
    value === "INFO" ||
    value === "WARNING" ||
    value === "ERROR" ||
    value === "DEBUG"
  ) return value;
  return "ALL";
}

export function countActiveFilters(
  level: string,
  module: string,
  searchText: string,
): number {
  let count = 0;
  if (level !== "ALL") count += 1;
  if (module !== "ALL") count += 1;
  if (searchText.trim()) count += 1;
  return count;
}

export function buildFilterUrl(
  currentParams: string,
  pathname: string,
  next: {
    level: string;
    module: string;
    q: string;
    limit: number;
    offset: number;
  },
  defaultLimit: number,
): string | null {
  const p = new URLSearchParams(currentParams);
  const set = (k: string, v: string, skip: string) => {
    if (v === skip) p.delete(k);
    else p.set(k, v);
  };
  set("level", next.level, "ALL");
  set("module", next.module, "ALL");
  set("q", next.q.trim() || "", "");
  if (next.limit === defaultLimit) p.delete("limit");
  else p.set("limit", String(next.limit));
  if (next.offset <= 0) p.delete("offset");
  else p.set("offset", String(next.offset));
  const query = p.toString();
  if (query === currentParams) return null;
  return query ? `${pathname}?${query}` : pathname;
}

export function buildLogsQueryParams(
  selectedLimit: number,
  selectedOffset: number,
  selectedLevel: string,
  selectedModule: string,
  searchText: string,
): string {
  const normalizedSearch = searchText.trim();
  const params = new URLSearchParams();
  params.set("limit", String(selectedLimit));
  params.set("offset", String(selectedOffset));
  if (selectedLevel !== "ALL") params.set("level", selectedLevel);
  if (selectedModule !== "ALL") params.set("module", selectedModule);
  if (normalizedSearch) params.set("q", normalizedSearch);
  return params.toString();
}
