"use client";

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

export function InvoicesPageFilters({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: {
  filter: InvoiceStatusFilter;
  setFilter: (value: InvoiceStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder="Enter patient name"
        ariaLabel="Search invoices"
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
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
            <SelectTrigger className="sm:!h-11 w-full sm:w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="sm:!h-11 w-full sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="amount-desc">Highest amount</SelectItem>
              <SelectItem value="amount-asc">Lowest amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
