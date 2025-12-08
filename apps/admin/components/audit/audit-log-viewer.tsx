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
    } catch (error) {
      console.error("Error fetching audit logs:", error);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-gray-600">
            System-wide audit trail (Real-time, updates every 30s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Filter by user ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                        {log.userId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs font-medium">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.resourceType ? (
                          <span className="text-xs">
                            {log.resourceType}{" "}
                            {log.resourceId && `(${log.resourceId})`}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === "success"
                              ? "bg-green-100 text-green-900"
                              : "bg-red-100 text-red-900"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {log.ipAddress || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRowExpand(log.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedRows.has(log.id) ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>

                    {expandedRows.has(log.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3">
                            {log.errorMessage && (
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="text-sm font-semibold text-red-900">
                                  Error
                                </p>
                                <p className="text-sm text-red-800 font-mono">
                                  {log.errorMessage}
                                </p>
                              </div>
                            )}

                            {log.changes &&
                              Object.keys(log.changes).length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                  <p className="text-sm font-semibold text-blue-900 mb-2">
                                    Changes
                                  </p>
                                  <pre className="text-xs bg-white rounded p-2 overflow-x-auto border border-blue-100">
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </div>
                              )}

                            {log.userAgent && (
                              <div className="bg-gray-100 rounded p-3">
                                <p className="text-xs text-gray-600">
                                  <span className="font-semibold">
                                    User Agent:
                                  </span>{" "}
                                  {log.userAgent}
                                </p>
                              </div>
                            )}

                            {log.metadata &&
                              Object.keys(log.metadata).length > 0 && (
                                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                  <p className="text-sm font-semibold text-purple-900 mb-2">
                                    Metadata
                                  </p>
                                  <pre className="text-xs bg-white rounded p-2 overflow-x-auto border border-purple-100">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
        Showing {logs.length} audit log entries. Page auto-refreshes every 30
        seconds. All sensitive actions (user updates, payments, admin
        operations) are logged for compliance.
      </div>
    </div>
  );
}

export default AuditLogViewer;
