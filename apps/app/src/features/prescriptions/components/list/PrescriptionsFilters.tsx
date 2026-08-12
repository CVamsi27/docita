import { useTranslation } from "react-i18next";
import { Button, IsoDatePickerField, Label, SearchInput, SymbolTooltip } from "@workspace/ui/components";

interface PrescriptionsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (iso: string) => void;
  onEndDateChange: (iso: string) => void;
}

export function PrescriptionsFilters({
  searchQuery,
  setSearchQuery,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: PrescriptionsFiltersProps) {
  const { t } = useTranslation("Prescriptions");
  const clearDaysDisabled =
    startDate.trim().length === 0 && endDate.trim().length === 0;
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder={t("filters.searchPlaceholder")}
        ariaLabel={t("filters.searchAriaLabel")}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label
            htmlFor="prescriptions-filter-start"
            className="text-xs text-muted-foreground"
          >
            {t("filters.from")}
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-start"
            label=""
            showLabel={false}
            value={startDate}
            onChange={onStartDateChange}
            placeholder={t("filters.startDatePlaceholder")}
            triggerClassName="w-full sm:w-[180px]"
          />
        </div>
        <div className="grid gap-2">
          <Label
            htmlFor="prescriptions-filter-end"
            className="text-xs text-muted-foreground"
          >
            {t("filters.to")}
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-end"
            label=""
            showLabel={false}
            value={endDate}
            onChange={onEndDateChange}
            placeholder={t("filters.endDatePlaceholder")}
            triggerClassName="w-full sm:w-[180px]"
          />
        </div>
        <SymbolTooltip label={t("filters.allDaysTooltip")}>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full px-4 font-normal sm:w-auto"
            disabled={clearDaysDisabled}
            onClick={() => {
              onStartDateChange("");
              onEndDateChange("");
            }}
          >
            {t("filters.allDays")}
          </Button>
        </SymbolTooltip>
      </div>
    </div>
  );
}
