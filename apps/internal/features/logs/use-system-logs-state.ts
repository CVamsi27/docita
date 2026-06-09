"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth";
import {
  type InternalSystemLog as SystemLog,
  useInternalSystemLogs,
} from "@workspace/data-access/internal";
import {
  buildLogsQueryParams,
  countActiveFilters,
  EMPTY_LOGS,
  parseLogLevel,
  parseLogLimit,
} from "./system-logs-helpers";

export function useSystemLogsState(defaultLimit: 25 | 50 | 100) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | SystemLog["level"]>("ALL");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedLimit, setSelectedLimit] = useState<25 | 50 | 100>(defaultLimit);
  const [selectedOffset, setSelectedOffset] = useState(0);

  useEffect(() => {
    const level = searchParams.get("level");
    const moduleParam = searchParams.get("module");
    const search = searchParams.get("q");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    setSelectedLevel(parseLogLevel(level));
    setSelectedModule(moduleParam || "ALL");
    setSearchText(search || "");
    setSelectedLimit(parseLogLimit(limit, defaultLimit));
    setSelectedOffset(
      offset && Number.isFinite(Number(offset)) && Number(offset) >= 0
        ? Number(offset)
        : 0,
    );
  }, [defaultLimit, searchParams]);

  const updateFilterParams = useCallback(
    (next: {
      level?: "ALL" | SystemLog["level"];
      module?: string;
      q?: string;
      limit?: 25 | 50 | 100;
      offset?: number;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nl = next.level ?? selectedLevel;
      const nm = next.module ?? selectedModule;
      const ns = next.q ?? searchText;
      const nL = next.limit ?? selectedLimit;
      const nO = next.offset ?? selectedOffset;
      const setOrDel = (k: string, v: string, skip: string) => {
        if (v === skip) params.delete(k); else params.set(k, v);
      };
      setOrDel("level", nl, "ALL");
      setOrDel("module", nm, "ALL");
      setOrDel("q", ns.trim() || "", "");
      if (nL === defaultLimit) params.delete("limit"); else params.set("limit", String(nL));
      if (nO <= 0) params.delete("offset"); else params.set("offset", String(nO));
      const query = params.toString();
      if (query === searchParams.toString()) return;
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultLimit, pathname, router, searchParams, selectedLevel, selectedModule, searchText, selectedLimit, selectedOffset],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilterParams({ q: searchText, offset: 0 });
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchText, updateFilterParams]);

  const logsParams = useMemo(
    () => buildLogsQueryParams(selectedLimit, selectedOffset, selectedLevel, selectedModule, searchText),
    [selectedLimit, selectedOffset, selectedLevel, selectedModule, searchText],
  );

  const { token } = useAuth();
  const logsQuery = useInternalSystemLogs(token, logsParams);

  const logs = useMemo(() => logsQuery.data?.logs ?? EMPTY_LOGS, [logsQuery.data]);
  const totalCount = logsQuery.data?.total ?? 0;
  const loading = logsQuery.isLoading;
  const errorMessage = logsQuery.isError
    ? getUserFacingErrorMessage(logsQuery.error, {
        context: "load",
        fallback: "We could not load these logs. Please try again.",
      })
    : null;

  const moduleOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.module))).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(selectedLevel, selectedModule, searchText),
    [selectedLevel, selectedModule, searchText],
  );

  const canGoPrevious = selectedOffset > 0;
  const canGoNext = selectedOffset + selectedLimit < totalCount;

  return {
    refreshing,
    setRefreshing,
    selectedLevel,
    setSelectedLevel,
    selectedModule,
    setSelectedModule,
    searchText,
    setSearchText,
    selectedLimit,
    setSelectedLimit,
    selectedOffset,
    setSelectedOffset,
    updateFilterParams,
    logsQuery,
    logs,
    totalCount,
    loading,
    errorMessage,
    moduleOptions,
    activeFilterCount,
    canGoPrevious,
    canGoNext,
  };
}
