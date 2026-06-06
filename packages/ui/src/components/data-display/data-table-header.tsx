import type { Dispatch, SetStateAction } from "react";
import { TableHeader, TableRow } from "./table";
import type {
  DataTableColumn,
  DataTableSortState,
} from "./data-table.types";
import { SortableHeadCell } from "./data-table-sortable-head";

interface DataTableHeaderRowProps<T> {
  columns: DataTableColumn<T>[];
  sort: DataTableSortState;
  onSortChange: Dispatch<SetStateAction<DataTableSortState>>;
  headerPad: string;
}

export function DataTableHeaderRow<T>({
  columns,
  sort,
  onSortChange,
  headerPad,
}: DataTableHeaderRowProps<T>) {
  return (
    <TableHeader className="sticky top-0 z-10 bg-surface-2">
      <TableRow>
        {columns.map((col) => (
          <SortableHeadCell
            key={col.id}
            col={col}
            sort={sort}
            onSortChange={onSortChange}
            headerPad={headerPad}
          />
        ))}
      </TableRow>
    </TableHeader>
  );
}
