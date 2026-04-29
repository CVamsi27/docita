import { ComponentType, useState } from "react";
import { Check, ChevronDown, ChevronUp, Lock, LucideProps } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Feature } from "@/lib/tier-config";

export interface FeatureDetail {
  name: string;
  description: string;
  icon: ComponentType<LucideProps>;
}

export interface PlanFeature {
  feature: Feature;
  details: FeatureDetail;
  hasAccess: boolean;
}

interface PlanFeaturesProps {
  features: PlanFeature[];
  maxDisplay?: number;
  align?: "left" | "center";
  display?: "compact" | "detailed";
}

export function PlanFeatures({
  features,
  maxDisplay,
  align = "left",
  display = "compact",
}: PlanFeaturesProps) {
  const [showAll, setShowAll] = useState(false);

  const displayFeatures =
    maxDisplay && !showAll ? features.slice(0, maxDisplay) : features;
  const remainingCount = maxDisplay ? features.length - maxDisplay : 0;
  const hasHiddenFeatures = maxDisplay && remainingCount > 0;

  return (
    <div className="space-y-2">
      {displayFeatures.map(({ feature, details, hasAccess }) => (
        <div
          key={feature}
          className={cn(
            display === "detailed"
              ? "flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-left"
              : "flex items-center gap-2 text-sm",
            align === "center" &&
              display === "compact" &&
              "justify-center text-center",
            !hasAccess && "text-muted-foreground",
          )}
        >
          {display === "detailed" ? (
            <>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <details.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {hasAccess ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {details.name}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {details.description}
                </p>
              </div>
            </>
          ) : (
            <>
              {hasAccess ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span
                className={cn(align === "center" ? "leading-snug" : "truncate")}
              >
                {details.name}
              </span>
            </>
          )}
        </div>
      ))}

      {hasHiddenFeatures && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs font-normal text-muted-foreground hover:text-foreground mt-2"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
        >
          {showAll ? (
            <>
              Show less <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              +{remainingCount} more features{" "}
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
