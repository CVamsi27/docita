import { Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Feature, getTierInfo } from "@/lib/tier-config";
import { getFeatureDetails } from "../../config/feature-config";

interface LockedFeaturesProps {
  lockedFeatures: Array<{
    feature: Feature;
    requiredTier: number;
    details: ReturnType<typeof getFeatureDetails>;
  }>;
}

export function LockedFeatures({ lockedFeatures }: LockedFeaturesProps) {
  if (lockedFeatures.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-600" />
          {lockedFeatures.length} Features Locked
        </CardTitle>
        <CardDescription>
          Upgrade to unlock these features and supercharge your practice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lockedFeatures
            .slice(0, 6)
            .map(({ feature, details, requiredTier }) => {
              const Icon = details.icon;
              return (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3 dark:bg-gray-900"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {details.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requires {getTierInfo(requiredTier).name}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {lockedFeatures.length > 6 && (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            +{lockedFeatures.length - 6} more features available in higher tiers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
