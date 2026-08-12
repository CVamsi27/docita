"use client";

import { useTranslation } from "react-i18next";
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

/**
 * Billing history table filters — namespaced under Subscription.billingFilters.
 */
function useBillingHistoryFiltersTranslations() {
  const { t } = useTranslation("Subscription.billingFilters");
  return t;
}

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
  const t = useBillingHistoryFiltersTranslations();
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-status" className="text-xs">
          {t("statusLabel")}
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(parseStatusFilterValue(v))}
        >
          <SelectTrigger id="billing-filter-status" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusAll")}</SelectItem>
            <SelectItem value="paid">{t("statusPaid")}</SelectItem>
            <SelectItem value="pending">{t("statusPending")}</SelectItem>
            <SelectItem value="failed">{t("statusFailed")}</SelectItem>
            <SelectItem value="refunded_void">{t("statusRefunded")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-from" className="text-xs">
          {t("fromLabel")}
        </Label>
        <IsoDatePickerField
          id="billing-filter-from"
          label=""
          showLabel={false}
          value={dateFrom}
          onChange={onDateFromChange}
          placeholder={t("anyDatePlaceholder")}
          triggerClassName="h-9 sm:w-auto sm:min-w-[140px]"
        />
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
        <Label htmlFor="billing-filter-to" className="text-xs">
          {t("toLabel")}
        </Label>
        <IsoDatePickerField
          id="billing-filter-to"
          label=""
          showLabel={false}
          value={dateTo}
          onChange={onDateToChange}
          placeholder={t("anyDatePlaceholder")}
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
        {t("clearFiltersButton")}
      </Button>
    </div>
  );
}
