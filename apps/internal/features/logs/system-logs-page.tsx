"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { getUserFacingErrorMessage } from "@workspace/types";
import { useAuth } from "@/lib/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { client } from "@/lib/api-client";
import { internalQueryKeys } from "@/lib/query-keys";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface SystemLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  module: string;
  message: string;
  details?: string;
}

interface SystemLogsPageProps {
  title: string;
  description: string;
  defaultLimit: 25 | 50 | 100;
  moduleColumnWidthClass: string;
}

const EMPTY_LOGS: SystemLog[] = [];

export function SystemLogsPage({
  title,
  description,
  defaultLimit,
  moduleColumnWidthClass,
}: SystemLogsPageProps) {
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
  const { token } = useAuth();

  useEffect(() => {
    const level = searchParams.get("level");
    const moduleParam = searchParams.get("module");
    const search = searchParams.get("q");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    setSelectedLevel(
      level === "INFO" ||
        level === "WARNING" ||
        level === "ERROR" ||
        level === "DEBUG"
        ? level
        : "ALL",
    );
    setSelectedModule(moduleParam || "ALL");
    setSearchText(search || "");
    setSelectedLimit(
      limit === "25" || limit === "50" || limit === "100"
        ? (Number(limit) as 25 | 50 | 100)
        : defaultLimit,
    );
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

  const logsParams = useMemo(() => {
    const normalizedSearch = searchText.trim();
    const params = new URLSearchParams();
    params.set("limit", String(selectedLimit));
    params.set("offset", String(selectedOffset));
    if (selectedLevel !== "ALL") params.set("level", selectedLevel);
    if (selectedModule !== "ALL") params.set("module", selectedModule);
    if (normalizedSearch) params.set("q", normalizedSearch);
    return params.toString();
  }, [
    selectedLimit,
    selectedOffset,
    selectedLevel,
    selectedModule,
    searchText,
  ]);

  const logsQuery = useQuery({
    queryKey: internalQueryKeys.internal.logs(logsParams),
    queryFn: async () => {
      const json = await client.get<
        SystemLog[] | { data?: SystemLog[]; total?: number }
      >(`/internal/logs?${logsParams}`);
      const logsData = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : [];
      const total = Array.isArray(json)
        ? json.length
        : typeof json.total === "number"
          ? json.total
          : logsData.length;

      return { logs: logsData, total };
    },
    enabled: Boolean(token),
  });

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

  const handleRefresh = () => {
    setRefreshing(true);
    logsQuery.refetch().finally(() => setRefreshing(false));
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "DEBUG":
        return (
          <Badge variant="outline" className="badge-muted">
            DEBUG
          </Badge>
        );
      case "INFO":
        return <Badge variant="secondary">INFO</Badge>;
      case "WARNING":
        return (
          <Badge variant="outline" className="badge-warning">
            WARNING
          </Badge>
        );
      case "ERROR":
        return <Badge variant="destructive">ERROR</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const moduleOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.module))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [logs]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedLevel !== "ALL") count += 1;
    if (selectedModule !== "ALL") count += 1;
    if (searchText.trim()) count += 1;
    return count;
  }, [selectedLevel, selectedModule, searchText]);

  const hasActiveFilters = activeFilterCount > 0;
  const canGoPrevious = selectedOffset > 0;
  const canGoNext = selectedOffset + selectedLimit < totalCount;
  const pageStart = totalCount === 0 ? 0 : selectedOffset + 1;
  const pageEnd = totalCount === 0 ? 0 : selectedOffset + logs.length;

  const handleResetFilters = () => {
    setSelectedLevel("ALL");
    setSelectedModule("ALL");
    setSearchText("");
    updateFilterParams({ level: "ALL", module: "ALL", q: "", offset: 0 });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilterParams({ q: searchText, offset: 0 });
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchText, updateFilterParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        size="compact"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {errorMessage && (
        <div className="surface-danger rounded-md p-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Severity
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedLevel}
            onChange={(e) => {
              const value = e.target.value as "ALL" | SystemLog["level"];
              setSelectedLevel(value);
              updateFilterParams({ level: value, offset: 0 });
            }}
          >
            <option value="ALL">All severities</option>
            <option value="ERROR">ERROR</option>
            <option value="WARNING">WARNING</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Module / Source
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedModule}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedModule(value);
              updateFilterParams({ module: value, offset: 0 });
            }}
          >
            <option value="ALL">All modules</option>
            {moduleOptions.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            value={searchText}
            onChange={(e) => {
              const value = e.target.value;
              setSearchText(value);
            }}
            placeholder="Message"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Page size
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedLimit}
            onChange={(e) => {
              const value = Number(e.target.value) as 25 | 50 | 100;
              setSelectedLimit(value);
              updateFilterParams({ limit: value, offset: 0 });
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        {hasActiveFilters && (
          <Badge variant="outline" className="mr-2 badge-muted">
            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
            active
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetFilters}
          disabled={!hasActiveFilters}
        >
          Reset filters
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead className={moduleColumnWidthClass}>Module</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No matching logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.timestamp), "MMM d, HH:mm:ss.SSS")}
                  </TableCell>
                  <TableCell>{getLevelBadge(log.level)}</TableCell>
                  <TableCell className="font-medium">{log.module}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{log.message}</span>
                      {log.details && (
                        <span className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded w-fit">
                          {log.details}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {pageStart}-{pageEnd} of {totalCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !canGoPrevious}
            onClick={() => {
              const nextOffset = Math.max(0, selectedOffset - selectedLimit);
              setSelectedOffset(nextOffset);
              updateFilterParams({ offset: nextOffset });
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !canGoNext}
            onClick={() => {
              const nextOffset = selectedOffset + selectedLimit;
              setSelectedOffset(nextOffset);
              updateFilterParams({ offset: nextOffset });
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
