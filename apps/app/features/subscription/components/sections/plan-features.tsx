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
}

export function PlanFeatures({ features, maxDisplay }: PlanFeaturesProps) {
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
            "flex items-center gap-2 text-sm",
            !hasAccess && "text-muted-foreground",
          )}
        >
          {hasAccess ? (
            <Check className="h-4 w-4 text-success shrink-0" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{details.name}</span>
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
