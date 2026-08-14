
import { formatDistanceToNow } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Button, SymbolTooltip } from "@workspace/ui/components";
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
  const { t } = useTranslation("Dashboard");
  const relative =
    updatedAtMs != null && Number.isFinite(updatedAtMs)
      ? formatDistanceToNow(updatedAtMs)
      : null;

  return (
    <div className="flex items-center gap-2">
      {relative ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("refreshControl.updated", { time: relative })}
        </span>
      ) : null}
      <SymbolTooltip label={t("refreshControl.refreshData")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 touch-manipulation"
          disabled={isRefreshing}
          onClick={() => void onRefresh()}
          aria-label={t("refreshControl.refreshData")}
        >
          <RefreshCw
            className={cn("h-4 w-4 shrink-0", isRefreshing && "animate-spin")}
            aria-hidden
          />
          <span className="hidden sm:inline">{t("refreshControl.refresh")}</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}
