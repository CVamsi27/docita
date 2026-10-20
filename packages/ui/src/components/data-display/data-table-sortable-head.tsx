import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { TableHead } from "./table";
import { Button } from "@workspace/ui/components/form/button";
import type { DataTableColumn, DataTableSortState } from "./data-table.types";

interface SortableHeadCellProps<T> {
  col: DataTableColumn<T>;
  sort: DataTableSortState;
  onSortChange: Dispatch<SetStateAction<DataTableSortState>>;
  headerPad: string;
}

const resolveAriaSort = (active: boolean, dir?: "asc" | "desc") =>
  active ? (dir === "asc" ? "ascending" : "descending") : "none";

export function SortableHeadCell<T>({
  col,
  sort,
  onSortChange,
  headerPad,
}: SortableHeadCellProps<T>) {
  const active = sort?.id === col.id;
  const ariaSort = resolveAriaSort(Boolean(active), sort?.dir);

  return (
    <TableHead
      aria-sort={col.ariaSort ?? (col.sort ? ariaSort : undefined)}
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1 p-0 hover:text-foreground"
          onClick={() =>
            onSortChange((prev) => {
              if (!prev || prev.id !== col.id)
                return { id: col.id, dir: "asc" };
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
        </Button>
      ) : (
        col.header
      )}
    </TableHead>
  );
}
