"use client";

import Link from "next/link";
import { formatCountLocale } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, TabsContent } from "@workspace/ui/components";
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatusCountCard
                title={t("status401Title")}
                count={securitySummaryQuery.data.status401}
                helper={t("rolling24hHelper")}
              />
              <StatusCountCard
                title={t("status403Title")}
                count={securitySummaryQuery.data.status403}
                helper={t("rolling24hHelper")}
              />
              <StatusCountCard
                title={t("status429Title")}
                count={securitySummaryQuery.data.status429}
                helper={t("rolling24hHelper")}
              />
              <StatusCountCard
                title={t("status5xxTitle")}
                count={securitySummaryQuery.data.status5xx}
                helper={t("serverErrorsHelper")}
              />
            </div>

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

interface StatusCountCardProps {
  title: string;
  count: number;
  helper: string;
}

/** Single count card for the security status tiles (status 401/403/429/5xx). */
function StatusCountCard({ title, count, helper }: StatusCountCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
          {formatCountLocale(count)}
        </div>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
