"use client";

import { formatCountLocale } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { useTranslations } from "next-intl";
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

export type ExperienceTabProps = Pick<
  SystemMonitoringPageViewModel,
  "webVitalsQuery"
>;

/**
 * Phase 3 (per-feature): apps/internal System monitoring > Experience
 * tab. 6 literals converted to
 * useTranslations("InternalSystemMonitoring.experienceTab").
 */
function useExperienceTabTranslations() {
  return useTranslations("InternalSystemMonitoring.experienceTab");
}

export function ExperienceTab({ webVitalsQuery }: ExperienceTabProps) {
  const t = useExperienceTabTranslations();
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
        loadingMessage={t("loadingLabel")}
        errorMessage={
          webVitalsQuery.error instanceof Error
            ? webVitalsQuery.error.message
            : t("errorFallback")
        }
        onRetry={() => void webVitalsQuery.refetch()}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("vitalsCardTitle")}</CardTitle>
            <CardDescription>
              {t("vitalsCardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(webVitalsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("emptyMessage")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colMetric")}</TableHead>
                      <TableHead className="text-right">{t("colCount")}</TableHead>
                      <TableHead className="text-right">{t("colAvg")}</TableHead>
                      <TableHead className="text-right">{t("colP95")}</TableHead>
                      <TableHead className="text-right">{t("colRating")}</TableHead>
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
