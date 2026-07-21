import React from "react";
import { useTranslations } from "next-intl";
import {
  Label,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui/components";
import type { ListInvoicesContractQuery } from "@workspace/types";

type InvoiceStatusFilter = ListInvoicesContractQuery["status"] | "all";

export interface InvoicesFiltersProps {
  filter: InvoiceStatusFilter;
  setFilter: (value: InvoiceStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

/**
 * Phase 3 (per-feature): apps/app Invoices > list filters.
 * 5 literals converted to useTranslations("Invoices.filters").
 */
function useInvoicesFiltersTranslations() {
  return useTranslations("Invoices.filters");
}

export function InvoicesFilters({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
}: InvoicesFiltersProps) {
  const t = useInvoicesFiltersTranslations();
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder={t("searchPlaceholder")}
        ariaLabel={t("searchAriaLabel")}
      />

      <div className="grid gap-2">
        <Label htmlFor="invoices-status-filter" className="text-xs text-muted-foreground">
          {t("statusLabel")}
        </Label>
        <Select
          value={filter}
          onValueChange={(value) => {
            if (
              value === "all" ||
              value === "PENDING" ||
              value === "CANCELLED" ||
              value === "PAID" ||
              value === "OVERDUE" ||
              value === "PARTIALLY_PAID"
            ) {
              setFilter(value);
            }
          }}
        >
          <SelectTrigger id="invoices-status-filter" className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="PAID">{t("statuses.paid")}</SelectItem>
            <SelectItem value="PENDING">{t("statuses.pending")}</SelectItem>
            <SelectItem value="OVERDUE">{t("statuses.overdue")}</SelectItem>
            <SelectItem value="PARTIALLY_PAID">{t("statuses.partiallyPaid")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
