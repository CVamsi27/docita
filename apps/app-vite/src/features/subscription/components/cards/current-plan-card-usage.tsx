import { Badge, Progress } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { formatUsageMeterCaption, usageMeterHasNoIncludedQuota, usageProgressPercentForBar } from "../../lib/usage-meter-display";
import { USAGE_ITEMS, formatUsageValue, type CurrentPlanCardProps } from "./current-plan-card-types";

export function CurrentPlanCardUsage({
  usage,
  isUsageLoading,
  hasUsageError,
  showWhatsAppUsageMeter = true,
}: Pick<CurrentPlanCardProps, "usage" | "isUsageLoading" | "hasUsageError" | "showWhatsAppUsageMeter">) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-foreground">Current usage</p></div>
        {usage && usage.total > 0 ? <Badge variant="destructive" className="self-start sm:self-auto">Overage active</Badge> : null}
      </div>

      {isUsageLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          Loading usage\u2026
        </div>
      ) : hasUsageError ? (
        <p className="mt-4 text-sm text-muted-foreground">Usage meters are temporarily unavailable.</p>
      ) : usage ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {(showWhatsAppUsageMeter ? USAGE_ITEMS : USAGE_ITEMS.filter((row) => row.key !== "whatsappMessages")).map(({ key, label, unit }) => {
            const meter = usage.meters[key];
            const noIncludedQuota = usageMeterHasNoIncludedQuota(meter.included);
            const percent = usageProgressPercentForBar(meter.current, meter.included);
            const caption = formatUsageMeterCaption(meter.current, meter.included, unit, formatUsageValue);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{caption}</span>
                </div>
                <Progress value={percent} className={cn("h-2", meter.overage > 0 && "[&>div]:bg-destructive", noIncludedQuota && meter.overage === 0 && "[&>div]:bg-primary/35")} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Usage appears here after your clinic starts using plan meters.</p>
      )}
    </div>
  );
}
