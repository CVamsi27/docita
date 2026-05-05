import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Search, X } from "lucide-react";

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
  const clearDaysDisabled = startDate.trim().length === 0 && endDate.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Enter patient, diagnosis, or phone"
            className={`bg-background pl-9${searchQuery.trim() ? " pr-10" : ""}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search prescriptions"
          />
          {searchQuery.trim() ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <SymbolTooltip label="Clear search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Button>
              </SymbolTooltip>
            </div>
          ) : null}
        </div>

        <div className="grid w-full gap-2 sm:w-auto">
          <Label htmlFor="prescriptions-filter-start" className="text-xs text-muted-foreground">
            From
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-start"
            label=""
            showLabel={false}
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Select start date"
            triggerClassName="w-full sm:w-[200px]"
          />
        </div>

        <div className="grid w-full gap-2 sm:w-auto">
          <Label htmlFor="prescriptions-filter-end" className="text-xs text-muted-foreground">
            To
          </Label>
          <IsoDatePickerField
            id="prescriptions-filter-end"
            label=""
            showLabel={false}
            value={endDate}
            onChange={onEndDateChange}
            placeholder="Select end date"
            triggerClassName="w-full sm:w-[200px]"
          />
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:shrink-0">
          <Label
            className="text-xs text-muted-foreground invisible select-none pointer-events-none"
            aria-hidden
          >
            From
          </Label>
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
    </div>
  );
}
