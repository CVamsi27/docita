"use client";

import { getUserFacingErrorMessage } from "@workspace/utils";
import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { useInternalAuditLogs } from "@workspace/data-access/internal";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";

export function AuditLogsPage() {
  const params = useMemo(() => "limit=100", []);
  const logsQuery = useInternalAuditLogs(params);
  const logs = logsQuery.data ?? [];

  const errorMessage = logsQuery.isError
    ? getUserFacingErrorMessage(logsQuery.error, {
        context: "load",
        fallback: "We could not load audit logs. Please try again.",
      })
    : null;

  const status = logsQuery.isLoading
    ? "loading"
    : errorMessage
      ? "error"
      : logs.length === 0
        ? "empty"
        : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Audit Logs"
          description="Tenant-scoped activity records from the platform audit trail."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logsQuery.refetch()}
              disabled={logsQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />
      }
    >
      <DataState
        status={status}
        loadingMessage="Loading audit logs…"
        errorMessage={errorMessage ?? undefined}
        onRetry={() => void logsQuery.refetch()}
        emptyTitle="No audit entries"
        emptyDescription="Activity will appear here when users perform audited actions."
      >
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatInternalTimestamp(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.actionType}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.resourceType
                      ? `${log.resourceType}${log.resourceId ? ` · ${log.resourceId}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.clinicId}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.userId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "success" ? "secondary" : "destructive"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {logs.length} recent entries. Refreshes every 30 seconds.
        </p>
      </DataState>
    </AppPageScaffold>
  );
}
