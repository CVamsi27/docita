"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "./button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, rowIndex: number) => ReactNode;
  sort?: (a: T, b: T) => number;
  align?: "left" | "right" | "center";
  width?: string;
  hiddenOnMobile?: boolean;
  className?: string;
}

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

type SortState = { id: string; dir: "asc" | "desc" } | null;

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
  stickyHeader = true,
  density = "comfortable",
  pageSize,
  className,
  caption,
  stackOnMobile = false,
  mobileRenderer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sort) return data;
    const next = [...data].sort(col.sort);
    return sort.dir === "asc" ? next : next.reverse();
  }, [columns, data, sort]);

  const paginated = useMemo(() => {
    if (!pageSize) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;

  if (error) {
    return <ErrorState message="We could not load this table. Please try again." />;
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
      {stackOnMobile && mobileRenderer ? (
        <div className="space-y-2 md:hidden">
          {paginated.map((row, idx) => (
            <div
              key={rowKey(row, idx)}
              className="ui-card-surface p-3"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {mobileRenderer(row)}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card",
          stackOnMobile && mobileRenderer ? "hidden md:block" : undefined,
        )}
      >
        <div className="overflow-x-auto">
          <Table>
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <TableHeader
              className={cn(stickyHeader && "sticky top-0 z-10 bg-surface-2")}
            >
              <TableRow>
                {columns.map((col) => {
                  const active = sort?.id === col.id;
                  const ariaSort = active
                    ? sort?.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  return (
                    <TableHead
                      key={col.id}
                      aria-sort={col.sort ? (ariaSort as "none" | "ascending" | "descending") : undefined}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        headerPad,
                        "text-[var(--fs-xs)] font-medium text-muted-foreground",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.hiddenOnMobile && "hidden md:table-cell",
                        col.className,
                      )}
                    >
                      {col.sort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            setSort((prev) => {
                              if (!prev || prev.id !== col.id) return { id: col.id, dir: "asc" };
                              if (prev.dir === "asc") return { id: col.id, dir: "desc" };
                              return null;
                            })
                          }
                          aria-label={`Sort by ${typeof col.header === "string" ? col.header : col.id}`}
                        >
                          <span>{col.header}</span>
                          {active ? (
                            sort?.dir === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-60" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((row, idx) => (
                <TableRow
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/40")}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        cellPad,
                        "text-[var(--fs-sm)]",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.hiddenOnMobile && "hidden md:table-cell",
                        col.className,
                      )}
                    >
                      {col.cell(row, idx)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pageSize ? (
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
            <div className="text-[var(--fs-xs)] text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
