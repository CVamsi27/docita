import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

export interface PlanFeature {
  feature: string;
  details: { name: string; description: string; icon?: React.ComponentType<{ className?: string }> };
  hasAccess: boolean;
}

interface PlanFeaturesProps {
  features: PlanFeature[];
  maxDisplay?: number;
  align?: "left" | "center";
  display?: "compact" | "detailed";
}

export function PlanFeatures({ features, maxDisplay, align = "left", display = "compact" }: PlanFeaturesProps) {
  const [showAll, setShowAll] = useState(false);
  const displayFeatures = maxDisplay && !showAll ? features.slice(0, maxDisplay) : features;
  const remainingCount = maxDisplay ? features.length - maxDisplay : 0;
  const hasHiddenFeatures = maxDisplay && remainingCount > 0;

  return (
    <div className={cn(display === "detailed" ? "space-y-3" : "space-y-2")}>
      {displayFeatures.map(({ feature, details, hasAccess }) => (
        <div key={feature} className={cn(display === "detailed" ? "grid grid-cols-[2rem_1fr] gap-3 text-left" : "flex items-center gap-2 text-sm", align === "center" && display === "compact" && "justify-center text-center", !hasAccess && "text-muted-foreground")}>
          {display === "detailed" ? (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                {details.icon ? <details.icon className="h-4 w-4" /> : null}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  {hasAccess ? <Check className="h-3.5 w-3.5 shrink-0 text-success" /> : <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <p className="min-w-0 text-sm font-semibold leading-tight text-foreground">{details.name}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{details.description}</p>
              </div>
            </>
          ) : (
            <>
              {hasAccess ? <Check className="h-4 w-4 text-success shrink-0" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className={cn(align === "center" ? "leading-snug" : "truncate")}>{details.name}</span>
            </>
          )}
        </div>
      ))}
      {hasHiddenFeatures && (
        <Button variant="ghost" size="sm" className="w-full h-8 text-xs font-normal text-muted-foreground hover:text-foreground mt-2"
          onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}>
          {showAll ? <>Show less <ChevronUp className="ml-1 h-3 w-3" /></> : <>+{remainingCount} more features <ChevronDown className="ml-1 h-3 w-3" /></>}
        </Button>
      )}
    </div>
  );
}
