import { useTranslation } from "react-i18next";
import { SearchInput } from "@workspace/ui/components/form/search-input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import type { ListInvoicesContractQuery } from "@workspace/types";

type InvoiceStatusFilter = ListInvoicesContractQuery["status"] | "all";

interface InvoicesFiltersProps {
  filter: InvoiceStatusFilter;
  setFilter: (value: InvoiceStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function InvoicesFilters({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
}: InvoicesFiltersProps) {
  const { t } = useTranslation("Invoices");
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder={t("filters.searchPlaceholder")}
        ariaLabel={t("filters.searchAriaLabel")}
      />

      <div className="grid gap-2">
        <Label htmlFor="invoices-status-filter" className="text-xs text-muted-foreground">
          {t("filters.statusLabel")}
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
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
            <SelectItem value="PENDING">{t("formSections.statusPending")}</SelectItem>
            <SelectItem value="PAID">{t("formSections.statusPaid")}</SelectItem>
            <SelectItem value="OVERDUE">{t("formSections.statusOverdue")}</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="CANCELLED">{t("formSections.statusCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
