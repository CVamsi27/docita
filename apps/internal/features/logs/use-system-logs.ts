"use client";

import { getUserFacingErrorMessage } from "@workspace/utils";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

export function useSystemLogs({
  defaultLimit,
}: {
  defaultLimit: 25 | 50 | 100;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<
    "ALL" | SystemLog["level"]
  >("ALL");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedLimit, setSelectedLimit] = useState<25 | 50 | 100>(
    defaultLimit,
  );
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

      const nextLevel = next.level ?? selectedLevel;
      const nextModule = next.module ?? selectedModule;
      const nextSearch = next.q ?? searchText;
      const nextLimit = next.limit ?? selectedLimit;
      const nextOffset = next.offset ?? selectedOffset;

      if (nextLevel === "ALL") params.delete("level");
      else params.set("level", nextLevel);

      if (!nextModule || nextModule === "ALL") params.delete("module");
      else params.set("module", nextModule);

      if (!nextSearch.trim()) params.delete("q");
      else params.set("q", nextSearch.trim());

      if (nextLimit === defaultLimit) params.delete("limit");
      else params.set("limit", String(nextLimit));

      if (nextOffset <= 0) params.delete("offset");
      else params.set("offset", String(nextOffset));

      const query = params.toString();
      const currentQuery = searchParams.toString();
      if (query === currentQuery) return;

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [
      defaultLimit,
      pathname,
      router,
      searchParams,
      selectedLevel,
      selectedModule,
      searchText,
      selectedLimit,
      selectedOffset,
    ],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilterParams({ q: searchText, offset: 0 });
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchText, updateFilterParams]);

  const logsParams = useMemo(
    () =>
      buildLogsQueryParams(
        selectedLimit,
        selectedOffset,
        selectedLevel,
        selectedModule,
        searchText,
      ),
    [selectedLimit, selectedOffset, selectedLevel, selectedModule, searchText],
  );

  const { token } = useAuth();
  const logsQuery = useInternalSystemLogs(token, logsParams);

  const logs = useMemo(
    () => logsQuery.data?.logs ?? EMPTY_LOGS,
    [logsQuery.data],
  );
  const totalCount = logsQuery.data?.total ?? 0;
  const loading = logsQuery.isLoading;
  const errorMessage = logsQuery.isError
    ? getUserFacingErrorMessage(logsQuery.error, {
        context: "load",
        fallback: "We could not load these logs. Please try again.",
      })
    : null;

  const moduleOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.module))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [logs]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(selectedLevel, selectedModule, searchText),
    [selectedLevel, selectedModule, searchText],
  );

  const hasActiveFilters = activeFilterCount > 0;
  const canGoPrevious = selectedOffset > 0;
  const canGoNext = selectedOffset + selectedLimit < totalCount;
  const pageStart = totalCount === 0 ? 0 : selectedOffset + 1;
  const pageEnd = totalCount === 0 ? 0 : selectedOffset + logs.length;

  const pageStatus = loading
    ? ("loading" as const)
    : errorMessage
      ? ("error" as const)
      : ("success" as const);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    logsQuery.refetch().finally(() => setRefreshing(false));
  }, [logsQuery]);

  const handleResetFilters = useCallback(() => {
    setSelectedLevel("ALL");
    setSelectedModule("ALL");
    setSearchText("");
    updateFilterParams({ level: "ALL", module: "ALL", q: "", offset: 0 });
  }, [updateFilterParams]);

  const handleLevelChange = useCallback(
    (value: string) => {
      const level = parseLogLevel(value);
      setSelectedLevel(level);
      updateFilterParams({ level, offset: 0 });
    },
    [updateFilterParams],
  );

  const handleModuleChange = useCallback(
    (value: string) => {
      setSelectedModule(value);
      updateFilterParams({ module: value, offset: 0 });
    },
    [updateFilterParams],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  const handleLimitChange = useCallback(
    (value: string) => {
      const next = parseLogLimit(value, defaultLimit);
      setSelectedLimit(next);
      updateFilterParams({ limit: next, offset: 0 });
    },
    [defaultLimit, updateFilterParams],
  );

  const goToPreviousPage = useCallback(() => {
    const nextOffset = Math.max(0, selectedOffset - selectedLimit);
    setSelectedOffset(nextOffset);
    updateFilterParams({ offset: nextOffset });
  }, [selectedOffset, selectedLimit, updateFilterParams]);

  const goToNextPage = useCallback(() => {
    const nextOffset = selectedOffset + selectedLimit;
    setSelectedOffset(nextOffset);
    updateFilterParams({ offset: nextOffset });
  }, [selectedOffset, selectedLimit, updateFilterParams]);

  return {
    selectedLevel,
    selectedModule,
    searchText,
    selectedLimit,
    refreshing,
    logs,
    totalCount,
    loading,
    errorMessage,
    moduleOptions,
    activeFilterCount,
    hasActiveFilters,
    canGoPrevious,
    canGoNext,
    pageStart,
    pageEnd,
    pageStatus,
    refetch: () => logsQuery.refetch(),
    handleRefresh,
    handleResetFilters,
    handleLevelChange,
    handleModuleChange,
    handleSearchChange,
    handleLimitChange,
    goToPreviousPage,
    goToNextPage,
  };
}
