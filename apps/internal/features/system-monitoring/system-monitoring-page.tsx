"use client";

import {
  AppPageScaffold,
  Button,
  DataState,
  PageHeader
} from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";
import { SystemMonitoringTabs } from "./system-monitoring-tabs";
import { useSystemMonitoringPage } from "./use-system-monitoring-page";

export default function SystemMonitoringPage() {
  const vm = useSystemMonitoringPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="System Monitoring"
          description="Live health, performance, and request telemetry"
          size="compact"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => vm.setAutoRefresh(!vm.autoRefresh)}
              >
                {vm.autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={vm.handleRefresh}
                disabled={vm.refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${vm.refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          }
        />
      }
    >
      <DataState
        status={vm.loading ? "loading" : "success"}
        loadingMessage="Loading system monitoring…"
      >
        <SystemMonitoringTabs vm={vm} />
      </DataState>
    </AppPageScaffold>
  );
}
