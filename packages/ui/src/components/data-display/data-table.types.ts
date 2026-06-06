import type { ReactNode } from "react";

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

export type DataTableSortState = { id: string; dir: "asc" | "desc" } | null;
