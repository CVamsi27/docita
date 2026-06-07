import type { ButtonHTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface SortableHeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  column: string;
  label: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
}

export function SortableHeaderButton({
  column,
  label,
  sortConfig,
  onSort,
}: SortableHeaderButtonProps) {
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
