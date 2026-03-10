"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  RefreshCw,
  ChevronDown,
  Filter,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface AuditLog {
  id: string;
  clinicId: string;
  userId: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedActionType) params.append("actionType", selectedActionType);
      if (selectedDate) {
        params.append("startDate", new Date(selectedDate).toISOString());
        params.append(
          "endDate",
          new Date(new Date(selectedDate).getTime() + 86400000).toISOString(),
        );
      }
      if (selectedUserId) params.append("userId", selectedUserId);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch {

      alert("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [selectedActionType, selectedDate, selectedUserId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

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
      alert("No logs to export");
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
      new Date(log.createdAt).toLocaleString(),
      log.userId,
      log.actionType,
      log.resourceType || "-",
      log.resourceId || "-",
      log.status,
      log.ipAddress || "-",
      log.errorMessage || "-",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const stringCell = String(cell);
            return stringCell.includes(",") ? `"${stringCell}"` : stringCell;
          })
          .join(","),
      ),
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    );
    element.setAttribute(
      "download",
      `audit_logs_${new Date().toISOString()}.csv`,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">
            System-wide audit trail (Real-time, updates every 30s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            variant="ghost"
            size="icon"
            title="Refresh"
            aria-label="Refresh audit logs"
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Action Type
              </label>
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">All Actions</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                User ID
              </label>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Filter by user ID"
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={resetFilters} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow>
                  <TableHead className="px-4 py-3">
                    Timestamp
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    User
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    Action
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    Resource
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    IP Address
                  </TableHead>
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
                        {new Date(log.createdAt).toLocaleString()}
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
                        <Button
                          onClick={() => toggleRowExpand(log.id)}
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
                                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto border border-border">
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
                                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto border border-border">
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

      <div className="bg-accent/40 border border-border rounded-lg p-3 text-sm text-foreground">
        Showing {logs.length} audit log entries. Page auto-refreshes every 30
        seconds. All sensitive actions (user updates, payments, admin
        operations) are logged for compliance.
      </div>
    </div>
  );
}

export default AuditLogViewer;
