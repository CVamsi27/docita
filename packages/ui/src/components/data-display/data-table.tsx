"use client";

import { type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Table } from "./table";
import { Skeleton } from "../feedback/skeleton";
import { EmptyState } from "../feedback/empty-state";
import { ErrorState } from "../feedback/error-state";
import { useDataTableSort } from "./use-data-table-sort";
import { useDataTablePagination } from "./use-data-table-pagination";
import { DataTableHeaderRow } from "./data-table-header";
import { DataTableBodyRows } from "./data-table-body";
import { DataTablePaginationControls } from "./data-table-pagination-controls";
import { DataTableToolbar } from "./data-table-toolbar";
import type { DataTableColumn } from "./data-table.types";

export type { DataTableColumn } from "./data-table.types";

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  isLoading?: boolean;
  error?: Error | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href?: string; onClick?: () => void };
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  pageSize?: number;
  className?: string;
  caption?: string;
  stackOnMobile?: boolean;
  mobileRenderer?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error = null,
  emptyTitle = "Nothing here yet",
  emptyDescription = "When items arrive, you will see them in this list.",
  emptyAction,
  onRowClick,
  density = "comfortable",
  pageSize,
  className,
  caption,
  stackOnMobile = false,
  mobileRenderer,
}: DataTableProps<T>) {
  const { sort, setSort, sorted } = useDataTableSort(data, columns);
  const { page, setPage, paginated, totalPages } = useDataTablePagination(
    sorted,
    pageSize,
  );

  if (error) {
    return (
      <ErrorState message="We could not load this table. Please try again." />
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const headerPad = density === "compact" ? "h-9 px-3" : "h-10 px-3";
  const cellPad = density === "compact" ? "py-2 px-3" : "py-2.5 px-3";

  return (
    <div className={cn("w-full", className)}>
      <DataTableToolbar
        stackOnMobile={stackOnMobile}
        mobileRenderer={mobileRenderer}
        paginated={paginated}
        rowKey={rowKey}
        onRowClick={onRowClick}
      />

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card",
          stackOnMobile && mobileRenderer ? "hidden md:block" : undefined,
        )}
      >
        <div className="overflow-x-auto overscroll-x-contain">
          <Table>
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <DataTableHeaderRow
              columns={columns}
              sort={sort}
              onSortChange={setSort}
              headerPad={headerPad}
            />
            <DataTableBodyRows
              columns={columns}
              paginated={paginated}
              rowKey={rowKey}
              onRowClick={onRowClick}
              cellPad={cellPad}
            />
          </Table>
        </div>
        {pageSize ? (
          <DataTablePaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}
