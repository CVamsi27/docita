import React from "react";
import {
  Button,
  IsoDatePickerField,
  Label,
  SearchInput,
  SymbolTooltip
} from "@workspace/ui/components";

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
  const clearDaysDisabled =
    startDate.trim().length === 0 && endDate.trim().length === 0;
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder="Enter patient, diagnosis, or phone"
        ariaLabel="Search prescriptions"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label
            htmlFor="prescriptions-filter-start"
            className="text-xs text-muted-foreground"
          >
            From
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-start"
            label=""
            showLabel={false}
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Select start date"
            triggerClassName="w-full sm:w-[180px]"
          />
        </div>
        <div className="grid gap-2">
          <Label
            htmlFor="prescriptions-filter-end"
            className="text-xs text-muted-foreground"
          >
            To
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-end"
            label=""
            showLabel={false}
            value={endDate}
            onChange={onEndDateChange}
            placeholder="Select end date"
            triggerClassName="w-full sm:w-[180px]"
          />
        </div>
        <SymbolTooltip label="Show all days (no date filter)">
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
            All days
          </Button>
        </SymbolTooltip>
      </div>
    </div>
  );
}
