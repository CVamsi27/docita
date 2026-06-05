import React from "react";
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

export interface InvoicesFiltersProps {
  filter: InvoiceStatusFilter;
  setFilter: (value: InvoiceStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}

export function InvoicesFilters({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: InvoicesFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery("")}
        placeholder="Enter patient name"
        ariaLabel="Search invoices"
      />

      <div className="grid gap-2">
        <Label htmlFor="invoices-status-filter" className="text-xs text-muted-foreground">
          Status
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
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="invoices-sort-filter" className="text-xs text-muted-foreground">
          Sort by
        </Label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger id="invoices-sort-filter" className="w-full sm:w-[180px]">
            <SelectValue placeholder="Newest first" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="amount-desc">Highest Amount</SelectItem>
            <SelectItem value="amount-asc">Lowest Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
