"use client";

import {
  AppPageScaffold,
  Button,
  DataState,
  PageHeader
} from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { addDaysToPickerIsoDate } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { formatDate } from "@/lib/formatters";
import { useDaybook } from "@/features/daybook/hooks/use-daybook";
import {
  DaybookSummaryCardsSection,
  DaybookByMethodSection,
  DaybookLedgerSection,
  DaybookCloseDaySection,
} from "./DaybookPageContentSections";

export function DaybookPageContent() {
  const {
    selectedDayIso,
    setSelectedDayIso,
    isToday,
    isLoading,
    isError,
    refetch,
    summary,
  } = useDaybook();
  const { formatCurrency } = useClinicCurrency();

  const header = (
    <PageHeader
      title="Daybook"
      description="End-of-day cash reconciliation — collections, payment-method breakdown, and ledger for the day."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous day"
              onClick={() =>
                setSelectedDayIso(addDaysToPickerIsoDate(selectedDayIso, -1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7.5rem] px-1 text-center text-[length:var(--fs-sm)] font-medium tabular-nums">
              {formatDate(selectedDayIso, "d MMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Next day"
              disabled={isToday}
              onClick={() =>
                setSelectedDayIso(addDaysToPickerIsoDate(selectedDayIso, 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={refetch}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      }
    />
  );

  if (isError) {
    return (
      <FeatureGate feature={Feature.INVOICING} showLockedCard>
        <AppPageScaffold header={header}>
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage="We could not load the daybook for this day. Please try again."
            onRetry={refetch}
          />
        </AppPageScaffold>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <AppPageScaffold header={header}>
        <DaybookSummaryCardsSection
          summary={summary}
          formatCurrency={formatCurrency}
          isLoading={isLoading}
        />
        <DaybookByMethodSection
          summary={summary}
          formatCurrency={formatCurrency}
          isLoading={isLoading}
        />
        <DaybookLedgerSection
          summary={summary}
          formatCurrency={formatCurrency}
          isLoading={isLoading}
        />
        <DaybookCloseDaySection />
      </AppPageScaffold>
    </FeatureGate>
  );
}
