import type { ButtonHTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

interface SortConfig<K extends string = string> {
  key: K;
  direction: "asc" | "desc";
}

interface SortableHeaderButtonProps<K extends string = string> extends ButtonHTMLAttributes<HTMLButtonElement> {
  column: K;
  label: string;
  sortConfig: SortConfig<K> | null;
  onSort: (key: K) => void;
}

export function SortableHeaderButton<K extends string = string>({
  column,
  label,
  sortConfig,
  onSort,
}: SortableHeaderButtonProps<K>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="gap-1 h-8 px-0 font-medium hover:bg-transparent"
    >
      {label}
      {sortConfig?.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
}
