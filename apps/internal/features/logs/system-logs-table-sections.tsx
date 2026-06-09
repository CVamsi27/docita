"use client";

import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";
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

export function getLevelBadge(level: string) {
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
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Severity
        </label>
        <Select value={selectedLevel} onValueChange={onLevelChange}>
          <SelectTrigger aria-label="Severity" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All severities</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="WARNING">WARNING</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Module / Source
        </label>
        <Select value={selectedModule} onValueChange={onModuleChange}>
          <SelectTrigger aria-label="Module / Source" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All modules</SelectItem>
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
          Search
        </label>
        <Input
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Message"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Page size
        </label>
        <Select value={String(selectedLimit)} onValueChange={onLimitChange}>
          <SelectTrigger aria-label="Page size" className="w-full">
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
  return (
    <div className="flex justify-end">
      {hasActiveFilters && (
        <Badge variant="outline" className="mr-2 badge-muted">
          {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetFilters}
        disabled={!hasActiveFilters}
      >
        Reset filters
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
  return (
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
                Loading logs…
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
                  {formatDate(log.timestamp, "dd MMM yyyy, HH:mm:ss.SSS")}
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
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {pageStart}-{pageEnd} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !canGoPrevious}
          onClick={onPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !canGoNext}
          onClick={onNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
