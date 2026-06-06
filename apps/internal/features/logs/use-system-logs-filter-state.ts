"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";
import { buildFilterUrl, buildLogsQueryParams, parseLogLevel, parseLogLimit } from "./system-logs-helpers";

export function useSystemLogsFilterState(defaultLimit: 25 | 50 | 100) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | SystemLog["level"]>("ALL");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedLimit, setSelectedLimit] = useState<25 | 50 | 100>(defaultLimit);
  const [selectedOffset, setSelectedOffset] = useState(0);

  useEffect(() => {
    setSelectedLevel(parseLogLevel(searchParams.get("level")));
    setSelectedModule(searchParams.get("module") || "ALL");
    setSearchText(searchParams.get("q") || "");
    setSelectedLimit(parseLogLimit(searchParams.get("limit"), defaultLimit));
    const ro = searchParams.get("offset");
    setSelectedOffset(ro && Number.isFinite(+ro) && +ro >= 0 ? +ro : 0);
  }, [defaultLimit, searchParams]);

  const updateFilterParams = useCallback(
    (next: { level?: "ALL" | SystemLog["level"]; module?: string; q?: string; limit?: 25 | 50 | 100; offset?: number }) => {
      const url = buildFilterUrl(
        searchParams.toString(), pathname,
        { level: next.level ?? selectedLevel, module: next.module ?? selectedModule, q: next.q ?? searchText, limit: next.limit ?? selectedLimit, offset: next.offset ?? selectedOffset },
        defaultLimit,
      );
      if (url !== null) router.replace(url, { scroll: false });
    },
    [defaultLimit, pathname, router, searchParams, selectedLevel, selectedModule, searchText, selectedLimit, selectedOffset],
  );

  useEffect(() => {
    const t = setTimeout(() => updateFilterParams({ q: searchText, offset: 0 }), 250);
    return () => clearTimeout(t);
  }, [searchText, updateFilterParams]);

  const logsParams = useMemo(
    () => buildLogsQueryParams(selectedLimit, selectedOffset, selectedLevel, selectedModule, searchText),
    [selectedLimit, selectedOffset, selectedLevel, selectedModule, searchText],
  );

  return {
    refreshing, setRefreshing, selectedLevel, setSelectedLevel,
    selectedModule, setSelectedModule, searchText, setSearchText,
    selectedLimit, setSelectedLimit, selectedOffset, setSelectedOffset,
    updateFilterParams, logsParams,
  };
}
