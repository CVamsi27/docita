import { cn } from "@workspace/ui/lib/utils";
import { TableBody, TableCell, TableRow } from "./table";
import type { DataTableColumn } from "./data-table.types";

interface DataTableBodyRowsProps<T> {
  columns: DataTableColumn<T>[];
  paginated: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  cellPad: string;
}

export function DataTableBodyRows<T>({
  columns,
  paginated,
  rowKey,
  onRowClick,
  cellPad,
}: DataTableBodyRowsProps<T>) {
  return (
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
  );
}
