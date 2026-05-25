"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Label } from "@workspace/ui/components/form/label";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  parseStatusFilterValue,
  type StatusFilterValue,
} from "./billing-history-table-helpers";

export function BillingHistoryTableFilters({
  statusFilter,
  dateFrom,
  dateTo,
  onStatusFilterChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: {
  statusFilter: StatusFilterValue;
  dateFrom: string;
  dateTo: string;
  onStatusFilterChange: (value: StatusFilterValue) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-status" className="text-xs">
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(parseStatusFilterValue(v))}
        >
          <SelectTrigger id="billing-filter-status" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending / unpaid</SelectItem>
            <SelectItem value="failed">Failed / declined</SelectItem>
            <SelectItem value="refunded_void">Refunded / void</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-from" className="text-xs">
          From
        </Label>
        <IsoDatePickerField
          id="billing-filter-from"
          label=""
          showLabel={false}
          value={dateFrom}
          onChange={onDateFromChange}
          placeholder="Any"
          triggerClassName="h-9 sm:w-auto sm:min-w-[140px]"
        />
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-to" className="text-xs">
          To
        </Label>
        <IsoDatePickerField
          id="billing-filter-to"
          label=""
          showLabel={false}
          value={dateTo}
          onChange={onDateToChange}
          placeholder="Any"
          triggerClassName="h-9 sm:w-auto sm:min-w-[140px]"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="sm:ml-auto"
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}
