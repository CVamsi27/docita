import { type ReactNode } from "react";

interface DataTableToolbarProps<T> {
  stackOnMobile: boolean;
  mobileRenderer?: (row: T) => ReactNode;
  paginated: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}

export function DataTableToolbar<T>({
  stackOnMobile,
  mobileRenderer,
  paginated,
  rowKey,
  onRowClick,
}: DataTableToolbarProps<T>) {
  if (!stackOnMobile || !mobileRenderer) return null;

  return (
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
  );
}
