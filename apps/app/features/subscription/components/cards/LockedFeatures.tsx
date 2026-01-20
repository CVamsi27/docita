import { Lock, Unlock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
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
    <Card className="relative overflow-hidden border-2 border-amber-300/50 bg-linear-to-br from-amber-50 via-amber-50/50 to-background dark:from-amber-950/30 dark:via-amber-900/20 dark:to-slate-900/50 dark:border-amber-700/30">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 dark:bg-amber-500/10" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lock className="h-5 w-5" />
              {lockedFeatures.length} Features Locked
            </CardTitle>
            <CardDescription className="text-amber-600/80 dark:text-amber-400/70">
              Upgrade to unlock these features and supercharge your practice
            </CardDescription>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
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
                  className="flex items-center gap-3 rounded-xl border border-amber-200/70 bg-white/80 p-3 dark:border-amber-800/50 dark:bg-slate-800/70 backdrop-blur-sm transition-all hover:border-amber-300 dark:hover:border-amber-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-amber-900 dark:text-amber-100">
                      {details.name}
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                      Requires {tierInfo.name}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {lockedFeatures.length > 6 && (
          <p className="mt-4 text-sm text-amber-600/80 dark:text-amber-400/70 text-center">
            +{lockedFeatures.length - 6} more features available in higher tiers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
