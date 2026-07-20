"use client";

import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";
import { useTranslations } from "next-intl";
import { formatDate } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

/**
 * Phase 3 (per-feature): apps/internal Logs > System Logs
 * table — filter bar, filter summary, results table, and
 * pagination. 10 literals converted to useTranslations
 * (\"InternalSystemLogs.table\").
 */
function useSystemLogsTranslations() {
  return useTranslations("InternalSystemLogs.table");
}

// Component (not a helper function) because we call useTranslations — a
// React hook. Helpers that invoke hooks violate react-hooks/rules-of-hooks
// and risk the hook state desyncing across rows.
export function LevelBadge({ level }: { level: string }) {
  const t = useSystemLogsTranslations();
  switch (level) {
    case "DEBUG":
      return (
        <Badge variant="outline" className="badge-muted">
          {t("levelDebug")}
        </Badge>
      );
    case "INFO":
      return <Badge variant="secondary">{t("levelInfo")}</Badge>;
    case "WARNING":
      return (
        <Badge variant="outline" className="badge-warning">
          {t("levelWarning")}
        </Badge>
      );
    case "ERROR":
      return <Badge variant="destructive">{t("levelError")}</Badge>;
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
}

interface SystemLogsFilterBarProps {
  selectedLevel: string;
  selectedModule: string;
  searchText: string;
  selectedLimit: 25 | 50 | 100;
  moduleOptions: string[];
  onLevelChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onLimitChange: (value: string) => void;
}

/** Severity / module / search / page-size filter controls for the system logs table. */
export function SystemLogsFilterBar({
  selectedLevel,
  selectedModule,
  searchText,
  selectedLimit,
  moduleOptions,
  onLevelChange,
  onModuleChange,
  onSearchChange,
  onLimitChange,
}: SystemLogsFilterBarProps) {
  const t = useSystemLogsTranslations();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("severityLabel")}
        </label>
        <Select value={selectedLevel} onValueChange={onLevelChange}>
          <SelectTrigger aria-label={t("severityLabel")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allSeverities")}</SelectItem>
            <SelectItem value="ERROR">{t("levelError")}</SelectItem>
            <SelectItem value="WARNING">{t("levelWarning")}</SelectItem>
            <SelectItem value="INFO">{t("levelInfo")}</SelectItem>
            <SelectItem value="DEBUG">{t("levelDebug")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("moduleLabel")}
        </label>
        <Select value={selectedModule} onValueChange={onModuleChange}>
          <SelectTrigger aria-label={t("moduleLabel")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allModules")}</SelectItem>
            {moduleOptions.map((module) => (
              <SelectItem key={module} value={module}>
                {module}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("searchLabel")}
        </label>
        <Input
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("pageSizeLabel")}
        </label>
        <Select value={String(selectedLimit)} onValueChange={onLimitChange}>
          <SelectTrigger aria-label={t("pageSizeLabel")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Active-filter count badge plus the reset-filters action. */
export function SystemLogsFilterSummary({
  activeFilterCount,
  hasActiveFilters,
  onResetFilters,
}: {
  activeFilterCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}) {
  const t = useSystemLogsTranslations();
  return (
    <div className="flex justify-end">
      {hasActiveFilters && (
        <Badge variant="outline" className="mr-2 badge-muted">
          {t("activeFilterBadge", { count: activeFilterCount })}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetFilters}
        disabled={!hasActiveFilters}
      >
        {t("resetFiltersButton")}
      </Button>
    </div>
  );
}

/** The logs results table — header, loading/empty states, and row rendering. */
export function SystemLogsResultsTable({
  logs,
  loading,
  moduleColumnWidthClass,
}: {
  logs: SystemLog[];
  loading: boolean;
  moduleColumnWidthClass: string;
}) {
  const t = useSystemLogsTranslations();
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">{t("colTimestamp")}</TableHead>
            <TableHead className="w-[100px]">{t("colLevel")}</TableHead>
            <TableHead className={moduleColumnWidthClass}>{t("colModule")}</TableHead>
            <TableHead>{t("colMessage")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("loadingLogs")}
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("noMatchingLogs")}
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {formatDate(log.timestamp, "dd MMM yyyy, HH:mm:ss.SSS")}
                </TableCell>
                <TableCell><LevelBadge level={log.level} /></TableCell>
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
  );
}

/** "Showing X-Y of Z" summary plus previous/next pagination controls. */
export function SystemLogsPagination({
  loading,
  totalCount,
  pageStart,
  pageEnd,
  canGoPrevious,
  canGoNext,
  onPreviousPage,
  onNextPage,
}: {
  loading: boolean;
  totalCount: number;
  pageStart: number;
  pageEnd: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  const t = useSystemLogsTranslations();
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t("paginationSummary", { start: pageStart, end: pageEnd, total: totalCount })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !canGoPrevious}
          onClick={onPreviousPage}
        >
          {t("previousButton")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !canGoNext}
          onClick={onNextPage}
        >
          {t("nextButton")}
        </Button>
      </div>
    </div>
  );
}
