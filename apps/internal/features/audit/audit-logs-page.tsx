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
import { useTranslations } from "next-intl";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";

/**
 * Phase 3 (per-feature): apps/internal Audit > Logs page. 6 literals
 * converted to useTranslations("InternalAudit.logsPage").
 */
function useAuditLogsTranslations() {
  return useTranslations("InternalAudit.logsPage");
}

export function AuditLogsPage() {
  const t = useAuditLogsTranslations();
  const params = useMemo(() => "limit=100", []);
  const logsQuery = useInternalAuditLogs(params);
  const logs = logsQuery.data ?? [];

  const errorMessage = logsQuery.isError
    ? getUserFacingErrorMessage(logsQuery.error, {
        context: "load",
        fallback: t("loadErrorFallback"),
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
          title={t("title")}
          description={t("description")}
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
              {t("refreshButton")}
            </Button>
          }
        />
      }
    >
      <DataState
        status={status}
        loadingMessage={t("loadingLabel")}
        errorMessage={errorMessage ?? undefined}
        onRetry={() => void logsQuery.refetch()}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
      >
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colTime")}</TableHead>
                <TableHead>{t("colAction")}</TableHead>
                <TableHead>{t("colResource")}</TableHead>
                <TableHead>{t("colClinic")}</TableHead>
                <TableHead>{t("colUser")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
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
                      {t(
                        log.status === "success"
                          ? "statusSuccess"
                          : "statusFailed"
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("recentEntriesFooter", { count: logs.length })}
        </p>
      </DataState>
    </AppPageScaffold>
  );
}
