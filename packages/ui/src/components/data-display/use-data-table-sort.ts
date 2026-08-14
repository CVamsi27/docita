import { useMemo, useState } from "react";
import type {
  DataTableColumn,
  DataTableSortState,
} from "./data-table.types";

export function useDataTableSort<T>(data: T[], columns: DataTableColumn<T>[]) {
  const [sort, setSort] = useState<DataTableSortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sort) return data;
    const next = [...data].sort(col.sort);
    return sort.dir === "asc" ? next : next.reverse();
  }, [columns, data, sort]);

  return { sort, setSort, sorted };
}
