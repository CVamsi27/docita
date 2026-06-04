"use client";

import React from "react";
import { Calendar, ChevronDown, Download, Filter, RefreshCw, User as UserIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import type { InternalAuditLog } from "@workspace/data-access/internal";
import { formatInternalTimestamp } from "@/lib/formatters/format-display-date";

interface ToolbarSectionProps {
  isLoading: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

interface FiltersSectionProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedActionType: string;
  onActionTypeChange: (type: string) => void;
  selectedUserId: string;
  onUserIdChange: (id: string) => void;
  actionTypes: string[];
  onReset: () => void;
}

interface TableSectionProps {
  logs: InternalAuditLog[];
  isLoading: boolean;
  errorMessage: string | null;
  expandedRows: Set<string>;
  onToggleRowExpand: (id: string) => void;
}

export function AuditLogToolbarSection({
  isLoading,
  showFilters,
  onToggleFilters,
  onRefresh,
  onExport,
}: ToolbarSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="ui-page-title">Audit Logs</h2>
        <p className="text-muted-foreground">
          System-wide audit trail (Real-time, updates every 30s)
        </p>
      </div>
      <div className="flex items-center gap-2">
        <SymbolTooltip label="Refresh audit logs">
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            variant="ghost"
            size="icon"
            aria-label="Refresh audit logs"
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </SymbolTooltip>
        <Button onClick={onToggleFilters} variant="outline">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <Button onClick={onExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}

export function AuditLogFiltersSection({
  selectedDate,
  onDateChange,
  selectedActionType,
  onActionTypeChange,
  selectedUserId,
  onUserIdChange,
  actionTypes,
  onReset,
}: FiltersSectionProps) {
  return (
    <div className="bg-muted/30 border border-border/70 rounded-[var(--radius)] p-4 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date
          </label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DatePicker
              value={selectedDate || undefined}
              onChange={(date) =>
                onDateChange(date?.toISOString().slice(0, 10) ?? "")
              }
              placeholder="Date"
              className="flex-1"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Action Type
          </label>
          <Select value={selectedActionType} onValueChange={onActionTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              {actionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            User ID
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={selectedUserId}
              onChange={(e) => onUserIdChange(e.target.value)}
              placeholder="User ID"
              className="pl-9"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onReset} variant="outline">
          Reset
        </Button>
      </div>
    </div>
  );
}

export function AuditLogTableSection({
  logs,
  isLoading,
  errorMessage,
  expandedRows,
  onToggleRowExpand,
}: TableSectionProps) {
  return (
    <div className="border border-border/70 rounded-[var(--radius)] overflow-hidden">
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}
      {isLoading && logs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading audit logs…
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No audit logs found
        </div>
      ) : (
        <div className="overflow-x-hidden">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow>
                <TableHead className="px-4 py-3">Timestamp</TableHead>
                <TableHead className="px-4 py-3">User</TableHead>
                <TableHead className="px-4 py-3">Action</TableHead>
                <TableHead className="px-4 py-3">Resource</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">IP Address</TableHead>
                <TableHead className="px-4 py-3 text-center">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow className="hover:bg-muted/50 transition-colors">
                    <TableCell className="px-4 py-3 text-foreground">
                      {formatInternalTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-foreground font-mono text-xs">
                      {log.userId}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {log.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {log.resourceType ? (
                        <span className="text-xs">
                          {log.resourceType}{" "}
                          {log.resourceId && `(${log.resourceId})`}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === "success"
                            ? "badge-success"
                            : "badge-danger"
                        }`}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <SymbolTooltip
                        label={
                          expandedRows.has(log.id)
                            ? "Collapse details"
                            : "Expand details"
                        }
                      >
                        <Button
                          onClick={() => onToggleRowExpand(log.id)}
                          variant="ghost"
                          size="icon"
                          aria-label={
                            expandedRows.has(log.id)
                              ? `Collapse details for log ${log.id}`
                              : `Expand details for log ${log.id}`
                          }
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedRows.has(log.id) ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </SymbolTooltip>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(log.id) && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={7} className="px-4 py-4">
                        <div className="space-y-3">
                          {log.errorMessage && (
                            <div className="surface-danger rounded p-3">
                              <p className="text-sm font-semibold text-destructive">
                                Error
                              </p>
                              <p className="text-sm text-destructive font-mono">
                                {log.errorMessage}
                              </p>
                            </div>
                          )}
                          {log.changes &&
                            Object.keys(log.changes).length > 0 && (
                              <div className="bg-secondary/40 border border-border rounded p-3">
                                <p className="text-sm font-semibold text-foreground mb-2">
                                  Changes
                                </p>
                                <pre className="text-xs bg-background rounded p-2 overflow-x-hidden whitespace-pre-wrap break-words border border-border">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            )}
                          {log.userAgent && (
                            <div className="bg-muted rounded p-3">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">
                                  User Agent:
                                </span>{" "}
                                {log.userAgent}
                              </p>
                            </div>
                          )}
                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 && (
                              <div className="bg-accent/40 border border-border rounded p-3">
                                <p className="text-sm font-semibold text-foreground mb-2">
                                  Metadata
                                </p>
                                <pre className="text-xs bg-background rounded p-2 overflow-x-hidden whitespace-pre-wrap break-words border border-border">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function AuditLogFooterSection({
  logCount,
}: {
  logCount: number;
}) {
  return (
    <div className="bg-accent/40 border border-border/70 rounded-[var(--radius)] p-3 text-sm text-foreground">
      Showing {logCount} audit log entries. Page auto-refreshes every 30
      seconds. All sensitive actions (user updates, payments, admin operations)
      are logged for compliance.
    </div>
  );
}
