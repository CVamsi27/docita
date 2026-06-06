import { useCallback } from "react";
import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";
import { parseLogLevel, parseLogLimit } from "./system-logs-helpers";

export function useSystemLogsHandlers(input: {
  setRefreshing: (v: boolean) => void;
  setSelectedLevel: (v: "ALL" | SystemLog["level"]) => void;
  setSelectedModule: (v: string) => void;
  setSearchText: (v: string) => void;
  setSelectedLimit: (v: 25 | 50 | 100) => void;
  setSelectedOffset: (v: number) => void;
  updateFilterParams: (next: { level?: "ALL" | SystemLog["level"]; module?: string; q?: string; limit?: 25 | 50 | 100; offset?: number }) => void;
  refetch: () => Promise<unknown>;
  selectedOffset: number;
  selectedLimit: number;
  defaultLimit: 25 | 50 | 100;
}) {
  const { setRefreshing, setSelectedLevel, setSelectedModule, setSearchText, setSelectedLimit, setSelectedOffset, updateFilterParams, refetch, selectedOffset, selectedLimit, defaultLimit } = input;

  const handleRefresh = useCallback(() => { setRefreshing(true); refetch().finally(() => setRefreshing(false)); }, [refetch, setRefreshing]);
  const handleResetFilters = useCallback(() => { setSelectedLevel("ALL"); setSelectedModule("ALL"); setSearchText(""); updateFilterParams({ level: "ALL", module: "ALL", q: "", offset: 0 }); }, [updateFilterParams, setSelectedLevel, setSelectedModule, setSearchText]);
  const handleLevelChange = useCallback((value: string) => { const level = parseLogLevel(value); setSelectedLevel(level); updateFilterParams({ level, offset: 0 }); }, [updateFilterParams, setSelectedLevel]);
  const handleModuleChange = useCallback((value: string) => { setSelectedModule(value); updateFilterParams({ module: value, offset: 0 }); }, [updateFilterParams, setSelectedModule]);
  const handleSearchChange = useCallback((value: string) => { setSearchText(value); }, [setSearchText]);
  const handleLimitChange = useCallback((value: string) => { const next = parseLogLimit(value, defaultLimit); setSelectedLimit(next); updateFilterParams({ limit: next, offset: 0 }); }, [defaultLimit, updateFilterParams, setSelectedLimit]);
  const goToPreviousPage = useCallback(() => { const next = Math.max(0, selectedOffset - selectedLimit); setSelectedOffset(next); updateFilterParams({ offset: next }); }, [selectedOffset, selectedLimit, updateFilterParams, setSelectedOffset]);
  const goToNextPage = useCallback(() => { const next = selectedOffset + selectedLimit; setSelectedOffset(next); updateFilterParams({ offset: next }); }, [selectedOffset, selectedLimit, updateFilterParams, setSelectedOffset]);

  return { handleRefresh, handleResetFilters, handleLevelChange, handleModuleChange, handleSearchChange, handleLimitChange, goToPreviousPage, goToNextPage };
}
