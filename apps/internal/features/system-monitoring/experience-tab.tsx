"use client";

import { formatCountLocale } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
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
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type ExperienceTabProps = Pick<
  SystemMonitoringPageViewModel,
  "webVitalsQuery"
>;

export function ExperienceTab({ webVitalsQuery }: ExperienceTabProps) {
  return (
    <TabsContent value="experience" className="space-y-6">
      <DataState
        status={
          webVitalsQuery.isLoading
            ? "loading"
            : webVitalsQuery.isError
              ? "error"
              : "success"
        }
        loadingMessage="Loading Core Web Vitals aggregates…"
        errorMessage={
          webVitalsQuery.error instanceof Error
            ? webVitalsQuery.error.message
            : "Could not load web vitals."
        }
        onRetry={() => void webVitalsQuery.refetch()}
      >
        <Card>
          <CardHeader>
            <CardTitle>Core Web Vitals (24h)</CardTitle>
            <CardDescription>
              Browser RUM aggregated from production beacons (LCP, INP, CLS,
              FCP, TTFB). Values follow the API rating helper thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(webVitalsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No vitals recorded in this window yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(webVitalsQuery.data ?? []).map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCountLocale(row.count)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.avg.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.p95.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.rating}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </DataState>
    </TabsContent>
  );
}
