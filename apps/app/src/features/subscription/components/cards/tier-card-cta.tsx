import { ArrowRight } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

export function TierCardSelectButton({
  tier, currentTierValue, isCurrentTier, isLocked, buttonLabel, onSelect,
}: {
  tier: number; currentTierValue?: number; isCurrentTier: boolean; isLocked: boolean;
  buttonLabel?: string; onSelect: () => void;
}) {
  const isUpgrade = currentTierValue !== undefined && tier > currentTierValue;
  const isDowngrade = currentTierValue !== undefined && tier < currentTierValue;
  const label = buttonLabel ?? (isLocked ? "Locked" : isCurrentTier ? "Current Plan" : isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Select Plan");

  return (
    <div className="mt-auto border-t border-border/70 bg-background/70 p-4">
      <Button
        className={cn("h-11 w-full gap-2", isCurrentTier && "bg-muted text-muted-foreground", isUpgrade && "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90", isDowngrade && "bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70")}
        variant={isDowngrade ? "outline" : "default"} disabled={isCurrentTier || isLocked} onClick={onSelect}>
        {label}{!isCurrentTier && !isLocked ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </Button>
    </div>
  );
}
