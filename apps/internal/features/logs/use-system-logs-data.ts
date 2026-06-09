"use client";

import { useMemo } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth";
import { useInternalSystemLogs } from "@workspace/data-access/internal";
import {
  countActiveFilters,
  EMPTY_LOGS,
} from "./system-logs-helpers";

export function useSystemLogsData(
  logsParams: string,
  selectedLevel: string,
  selectedModule: string,
  searchText: string,
  selectedOffset: number,
  selectedLimit: number,
) {
  const { token } = useAuth();
  const logsQuery = useInternalSystemLogs(token, logsParams);

  const logs = useMemo(() => logsQuery.data?.logs ?? EMPTY_LOGS, [logsQuery.data]);
  const totalCount = logsQuery.data?.total ?? 0;
  const loading = logsQuery.isLoading;
  const errorMessage = logsQuery.isError
    ? getUserFacingErrorMessage(logsQuery.error, { context: "load", fallback: "We could not load these logs. Please try again." })
    : null;

  const moduleOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.module))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  const activeFilterCount = useMemo(
    () => countActiveFilters(selectedLevel, selectedModule, searchText),
    [selectedLevel, selectedModule, searchText],
  );

  const canGoPrevious = selectedOffset > 0;
  const canGoNext = selectedOffset + selectedLimit < totalCount;

  return {
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
