import { useTranslation } from "react-i18next";
import { AppPageScaffold, Button, DataState, PageHeader } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { addDaysToPickerIsoDate, formatDate } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency } from "@/lib/formatters";
import { useDaybook } from "@/features/daybook/hooks/use-daybook";
import { DaybookSummaryCardsSection, DaybookByMethodSection, DaybookLedgerSection, DaybookCloseDaySection } from "./DaybookPageContentSections";

export function DaybookPageContent() {
  const { t } = useTranslation("Daybook");
  const {
    selectedDayIso,
    setSelectedDayIso,
    isToday,
    isLoading,
    isError,
    refetch,
    summary,
  } = useDaybook();
  const { currency } = useLocaleCurrency();
  const formatMoney = (amount: number) => formatCurrency(amount, currency);

  const header = (
    <PageHeader
      title={t("pageTitle")}
      description={t("pageDescription")}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("previousDayAriaLabel")}
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
              aria-label={t("nextDayAriaLabel")}
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
            {t("refreshButton")}
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
            errorMessage={t("error")}
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
          formatCurrency={formatMoney}
          isLoading={isLoading}
        />
        <DaybookByMethodSection
          summary={summary}
          formatCurrency={formatMoney}
          isLoading={isLoading}
        />
        <DaybookLedgerSection
          summary={summary}
          formatCurrency={formatMoney}
          isLoading={isLoading}
        />
        <DaybookCloseDaySection />
      </AppPageScaffold>
    </FeatureGate>
  );
}
