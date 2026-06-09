"use client";

import React, { useMemo, useState } from "react";
import { useInternalAuditLogs } from "@workspace/data-access/internal";
import { toast } from "sonner";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  AuditLogFiltersSection,
  AuditLogFooterSection,
  AuditLogTableSection,
  AuditLogToolbarSection,
} from "./audit-log-viewer-sections";

export function AuditLogViewer() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (selectedActionType) next.append("actionType", selectedActionType);
    if (selectedDate) {
      next.append("startDate", new Date(selectedDate).toISOString());
      next.append(
        "endDate",
        new Date(new Date(selectedDate).getTime() + 86400000).toISOString(),
      );
    }
    if (selectedUserId) next.append("userId", selectedUserId);
    return next.toString();
  }, [selectedActionType, selectedDate, selectedUserId]);

  const logsQuery = useInternalAuditLogs(params);

  const logs = logsQuery.data ?? [];
  const isLoading = logsQuery.isLoading;
  const errorMessage = logsQuery.isError
    ? "We could not load these audit logs. Please try again."
    : null;

  const actionTypes = Array.from(
    new Set(logs.map((log) => log.actionType)),
  ).sort();

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast.message("No audit logs to export");
      return;
    }

    const headers = [
      "Timestamp",
      "User ID",
      "Action",
      "Resource Type",
      "Resource ID",
      "Status",
      "IP Address",
      "Error Message",
    ];

    const rows = logs.map((log) => [
      formatInternalTimestamp(log.createdAt),
      log.userId,
      log.actionType,
      log.resourceType || "-",
      log.resourceId || "-",
      log.status,
      log.ipAddress || "-",
      log.errorMessage || "-",
    ]);

    const escapeCsvCell = (value: unknown) => {
      const stringCell = String(value ?? "");
      const escaped = stringCell.replace(/"/g, '""');
      return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    );
    element.setAttribute(
      "download",
      `audit_logs_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetFilters = () => {
    setSelectedDate("");
    setSelectedActionType("");
    setSelectedUserId("");
  };

  return (
    <div className="space-y-4">
      <AuditLogToolbarSection
        isLoading={isLoading}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onRefresh={() => {
          logsQuery.refetch().catch(() => {
            showUserFacingErrorToast(
              "We could not load these audit logs. Please try again.",
            );
          });
        }}
        onExport={exportToCSV}
      />

      {showFilters && (
        <AuditLogFiltersSection
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedActionType={selectedActionType}
          onActionTypeChange={setSelectedActionType}
          selectedUserId={selectedUserId}
          onUserIdChange={setSelectedUserId}
          actionTypes={actionTypes}
          onReset={resetFilters}
        />
      )}

      <AuditLogTableSection
        logs={logs}
        isLoading={isLoading}
        errorMessage={errorMessage}
        expandedRows={expandedRows}
        onToggleRowExpand={toggleRowExpand}
      />

      <AuditLogFooterSection logCount={logs.length} />
    </div>
  );
}
