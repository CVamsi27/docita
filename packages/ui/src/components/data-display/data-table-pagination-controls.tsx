import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../form/button";

interface DataTablePaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataTablePaginationControls({
  page,
  totalPages,
  onPageChange,
}: DataTablePaginationControlsProps) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
      <div className="text-[var(--fs-xs)] text-muted-foreground">
        Page {page + 1} of {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
