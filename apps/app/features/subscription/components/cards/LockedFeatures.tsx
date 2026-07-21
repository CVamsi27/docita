import { Lock, Unlock } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui/components";
import { Feature, getTierInfo } from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";

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
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Lock className="h-5 w-5" />
              {lockedFeatures.length} Features Locked
            </CardTitle>
            <CardDescription className="text-warning/80">
              Upgrade to unlock these features and supercharge your practice
            </CardDescription>
          </div>
          <Badge className="tier-enterprise border">
            <Unlock className="h-3 w-3 mr-1" />
            Upgrade to unlock
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lockedFeatures
            .slice(0, 6)
            .map(({ feature, details, requiredTier }) => {
              const Icon = details.icon;
              const tierInfo = getTierInfo(requiredTier);
              return (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-lg border border-warning/25 bg-background/80 p-3 transition-colors hover:border-warning/35"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15">
                    <Icon className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {details.name}
                    </p>
                    <p className="text-xs text-warning/80">
                      Requires {tierInfo.name}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {lockedFeatures.length > 6 && (
          <p className="mt-4 text-sm text-warning/80 text-center">
            +{lockedFeatures.length - 6} more features available in higher tiers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
