"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Filter } from "lucide-react";
import type { ListInvoicesContractQuery } from "@workspace/types";

type InvoiceStatusFilter = ListInvoicesContractQuery["status"] | "all";

export function InvoicesPageFiltersCard({
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[var(--fs-md)] font-medium">
          Filter &amp; Sort
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex flex-1 items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
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
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
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

          <div className="flex flex-1 items-center gap-2 md:max-w-xs">
            <Input
              type="search"
              placeholder="Enter patient name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[var(--fs-xs)] text-muted-foreground">
              Sort by:
            </span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort order" />
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
      </CardContent>
    </Card>
  );
}
