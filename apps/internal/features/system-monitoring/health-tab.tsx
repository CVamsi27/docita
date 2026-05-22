"use client";

import { DATE_FORMATS, formatDate, sanitizeUserFacingMessage } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import { ShieldAlert } from "lucide-react";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type HealthTabProps = Pick<
  SystemMonitoringPageViewModel,
  "appHealth" | "detailedChecks" | "getStatusIcon" | "getStatusBadge"
>;

export function HealthTab({
  appHealth,
  detailedChecks,
  getStatusIcon,
  getStatusBadge,
}: HealthTabProps) {
  return (
    <TabsContent value="health" className="space-y-6">
      {appHealth ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall System Status</CardTitle>
              <CardDescription>
                Live health check from the API runtime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {getStatusIcon(appHealth.status)}
                {getStatusBadge(appHealth.status)}
                <span className="text-muted-foreground">
                  Last checked:{" "}
                  {appHealth.timestamp
                    ? formatDate(
                        appHealth.timestamp,
                        DATE_FORMATS.DATETIME_LONG,
                      )
                    : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {appHealth.checks && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Health Checks</CardTitle>
                <CardDescription>
                  Database, memory, and CPU checks returned by `/health`
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(detailedChecks ?? {}).map(
                    ([serviceName, checkData]) => (
                      <div
                        key={serviceName}
                        className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(
                            typeof checkData.status === "string"
                              ? checkData.status
                              : "unknown",
                          )}
                          <div>
                            <p className="font-medium capitalize">
                              {serviceName}
                            </p>
                            {checkData.error && (
                              <p className="text-sm text-muted-foreground">
                                {sanitizeUserFacingMessage(
                                  checkData.error,
                                  "This check did not complete",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {checkData.latency !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {checkData.latency}ms
                            </span>
                          )}
                          {getStatusBadge(
                            typeof checkData.status === "string"
                              ? checkData.status
                              : "unknown",
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              We could not load this health data. Please try again.
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
