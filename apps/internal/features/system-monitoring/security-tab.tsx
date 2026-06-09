"use client";

import Link from "next/link";
import { formatCountLocale } from "@workspace/utils";
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

export function SecurityTab({ securitySummaryQuery }: SecurityTabProps) {
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
        loadingMessage="Loading API security signals…"
        errorMessage={
          securitySummaryQuery.error instanceof Error
            ? securitySummaryQuery.error.message
            : "Could not load security summary."
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
                    401 Unauthorized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status401)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rolling 24h from request logs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    403 Forbidden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status403)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rolling 24h from request logs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    429 Rate limited
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status429)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rolling 24h from request logs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">5xx errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {formatCountLocale(securitySummaryQuery.data.status5xx)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Server errors in window
                  </p>
                </CardContent>
              </Card>
            </div>
            {/* jscpd:ignore-end */}

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Top auth and rate-limit routes</CardTitle>
                  <CardDescription>
                    Paths with 401, 403, or 429 in the selected window (counts
                    only, no request bodies).
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/audits">Open audit log</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {securitySummaryQuery.data.topAuthFailureRoutes.length ===
                0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching responses in this window.
                  </p>
                ) : (
                  <div className="max-h-[360px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
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
