"use client";

import { formatDistanceToNow } from "@workspace/utils";
import { RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

interface DashboardRefreshControlProps {
  /** Latest `dataUpdatedAt` from relevant queries (ms since epoch). */
  updatedAtMs: number | null;
  isRefreshing: boolean;
  onRefresh: () => void | Promise<unknown>;
}

export function DashboardRefreshControl({
  updatedAtMs,
  isRefreshing,
  onRefresh,
}: DashboardRefreshControlProps) {
  const relative =
    updatedAtMs != null && Number.isFinite(updatedAtMs)
      ? formatDistanceToNow(updatedAtMs)
      : null;

  return (
    <div className="flex items-center gap-2">
      {relative ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Updated {relative}
        </span>
      ) : null}
      <SymbolTooltip label="Refresh data">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 touch-manipulation"
          disabled={isRefreshing}
          onClick={() => void onRefresh()}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={cn("h-4 w-4 shrink-0", isRefreshing && "animate-spin")}
            aria-hidden
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}
