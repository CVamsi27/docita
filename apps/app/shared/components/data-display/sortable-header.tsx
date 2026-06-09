import { SortableHeaderButton } from "@workspace/ui/components/data-display/sortable-header-button";

export function SortableHeader<K extends string>({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: K;
  label: string;
  sortConfig: { key: K; direction: "asc" | "desc" } | null;
  onSort: (key: K) => void;
}) {
  return (
    <SortableHeaderButton
      column={column}
      label={label}
      sortConfig={sortConfig}
      onSort={onSort}
    />
  );
}
