"use client";

import { Table, TableBody, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { EmptyState } from "@workspace/ui/components";
import type { LucideIcon } from "lucide-react";

interface TableOrEmptyProps<T> {
  items: ReadonlyArray<T>;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  /**
   * Renders the table header row. Should return the
   * `<TableRow>` JSX (including the column-head cells).
   */
  renderHeader: () => React.ReactNode;
  /** Renders one body row for the given item. */
  renderRow: (item: T, index: number) => React.ReactNode;
  /**
   * Renders the body wrapper. Defaults to mapping renderRow
   * over the items array inside a single `<TableBody>`. Use
   * this for grouped or paginated bodies.
   */
  renderBody?: (items: ReadonlyArray<T>) => React.ReactNode;
}

/**
 * Render a data table with an empty-state fallback. Pulled
 * out of `DoctorsTableSection` and `payment-processing-clinics-section`
 * to stop the 14-line CardContent/Table+EmptyState block from
 * jscpd-matching across the two screens.
 */
export function TableOrEmpty<T>({
  items,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  renderHeader,
  renderRow,
  renderBody,
}: TableOrEmptyProps<T>) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>{renderHeader()}</TableRow>
      </TableHeader>
      {renderBody ? (
        renderBody(items)
      ) : (
        <TableBody>
          {items.map((item, index) => renderRow(item, index))}
        </TableBody>
      )}
    </Table>
  );
}
