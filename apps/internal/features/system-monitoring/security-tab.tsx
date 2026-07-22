"use client";

import Link from "next/link";
import { formatCountLocale } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
// jscpd:ignore-end
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type SecurityTabProps = Pick<
  SystemMonitoringPageViewModel,
  "securitySummaryQuery"
>;

/**
 * Phase 3 (per-feature): apps/internal System monitoring > Security
 * tab. 7 literals converted to
 * useTranslations("InternalSystemMonitoring.securityTab").
 */
function useSecurityTabTranslations() {
  return useTranslations("InternalSystemMonitoring.securityTab");
}

export function SecurityTab({ securitySummaryQuery }: SecurityTabProps) {
  const t = useSecurityTabTranslations();
  return (
    <TabsContent value="security" className="space-y-6">
      <DataState
        status={
          securitySummaryQuery.isLoading
            ? "loading"
            : securitySummaryQuery.isError
              ? "error"
              : "success"
        }
        loadingMessage={t("loadingLabel")}
        errorMessage={
          securitySummaryQuery.error instanceof Error
            ? securitySummaryQuery.error.message
            : t("errorFallback")
        }
        onRetry={() => void securitySummaryQuery.refetch()}
      >
        {securitySummaryQuery.data ? (
          <>
            {/* jscpd:ignore-start */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("status401Title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status401)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("rolling24hHelper")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("status403Title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status403)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("rolling24hHelper")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("status429Title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status429)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("rolling24hHelper")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("status5xxTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status5xx)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("serverErrorsHelper")}
                  </p>
                </CardContent>
              </Card>
            </div>
            {/* jscpd:ignore-end */}

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{t("topRoutesTitle")}</CardTitle>
                  <CardDescription>
                    {t("topRoutesDescription")}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/audits">{t("openAuditLogButton")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {securitySummaryQuery.data.topAuthFailureRoutes.length ===
                0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("emptyMessage")}
                  </p>
                ) : (
                  <div className="max-h-[360px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("colPath")}</TableHead>
                          <TableHead>{t("colMethod")}</TableHead>
                          <TableHead>{t("colStatus")}</TableHead>
                          <TableHead className="text-right">{t("colCount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securitySummaryQuery.data.topAuthFailureRoutes.map(
                          (row) => (
                            <TableRow
                              key={`${row.method}-${row.path}-${row.statusCode}`}
                            >
                              <TableCell className="max-w-[280px] truncate font-mono text-xs">
                                {row.path}
                              </TableCell>
                              <TableCell>{row.method}</TableCell>
                              <TableCell>{row.statusCode}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCountLocale(row.count)}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </DataState>
    </TabsContent>
  );
}
