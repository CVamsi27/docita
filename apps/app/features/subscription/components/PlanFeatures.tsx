
import { Check, Lock } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Feature } from "@/lib/tier-config";

interface FeatureDetail {
  name: string;
  description: string;
  icon: any;
}

interface PlanFeature {
  feature: Feature;
  details: FeatureDetail;
  hasAccess: boolean;
}

interface PlanFeaturesProps {
  features: PlanFeature[];
  maxDisplay?: number;
}

export function PlanFeatures({ features, maxDisplay }: PlanFeaturesProps) {
  const displayFeatures = maxDisplay ? features.slice(0, maxDisplay) : features;
  const remainingCount = maxDisplay ? features.length - maxDisplay : 0;

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
            <Check className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{details.name}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground pl-6">
          +{remainingCount} more features
        </p>
      )}
    </div>
  );
}
