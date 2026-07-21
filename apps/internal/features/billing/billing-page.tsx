"use client";

import { useBillingDashboard } from "./use-billing-dashboard";
import { BillingMetricsGrid } from "./BillingMetricsGrid";
import { BillingGracePeriodDialog } from "./BillingGracePeriodDialog";
import { BillingRiskSummary } from "./BillingRiskSummary";
import { BillingDistributionCards } from "./BillingDistributionCards";
import { BillingDashboardTabs } from "./BillingDashboardTabs";
import {
  AppPageScaffold,
  Button,
  DataState,
  PageHeader
} from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";

export default function BillingDashboard() {
  const {
    refreshing,
    tierFilter,
    setTierFilter,
    statusFilter,
    setStatusFilter,
    billingCycleFilter,
    setBillingCycleFilter,
    extendGraceDialog,
    setExtendGraceDialog,
    extendDays,
    setExtendDays,
    sending,
    metrics,
    subscriptions,
    payments,
    pageStatus,
    errorMessage,
    handleRefresh,
    handleSendReminder,
    handleExtendGracePeriod,
    refetchBilling,
  } = useBillingDashboard();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Billing Dashboard"
          description="Monitor subscriptions, revenue, and payment activity"
          size="compact"
          actions={
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading billing dashboard…"
        errorMessage={errorMessage}
        onRetry={() => void refetchBilling()}
      >
        <BillingRiskSummary
          metrics={metrics}
          onSendReminder={handleSendReminder}
          onExtendGracePeriod={(subscription) =>
            setExtendGraceDialog({ open: true, subscription })
          }
        />
        <BillingMetricsGrid metrics={metrics} />
        <BillingDistributionCards metrics={metrics} />
        <BillingDashboardTabs
          tierFilter={tierFilter}
          statusFilter={statusFilter}
          billingCycleFilter={billingCycleFilter}
          subscriptions={subscriptions}
          payments={payments}
          metrics={metrics}
          sending={sending}
          onTierFilterChange={setTierFilter}
          onStatusFilterChange={setStatusFilter}
          onBillingCycleFilterChange={setBillingCycleFilter}
          onSendReminder={handleSendReminder}
          onExtendGracePeriod={(subscription) =>
            setExtendGraceDialog({ open: true, subscription })
          }
        />
      </DataState>

      <BillingGracePeriodDialog
        open={extendGraceDialog.open}
        onOpenChange={(open) => setExtendGraceDialog({ open })}
        subscriptionName={extendGraceDialog.subscription?.clinic.name ?? ""}
        extendDays={extendDays}
        onExtendDaysChange={setExtendDays}
        sending={sending}
        onConfirm={handleExtendGracePeriod}
      />
    </AppPageScaffold>
  );
}
