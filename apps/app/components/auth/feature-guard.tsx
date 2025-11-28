"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { Feature, FEATURE_TIER_MAP, getTierInfo } from "@/lib/tier-config";

interface FeatureGuardProps {
  children: ReactNode;
  feature: Feature;
  fallback?: ReactNode;
  showDefaultFallback?: boolean;
}

/**
 * FeatureGuard component - wraps content that requires a specific feature/tier
 * Use this component to gate entire page sections or features
 */
export function FeatureGuard({
  children,
  feature,
  fallback,
  showDefaultFallback = true,
}: FeatureGuardProps) {
  const router = useRouter();
  const { canAccess } = usePermissionStore();
  const isAllowed = canAccess(feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showDefaultFallback) {
    return null;
  }

  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierInfo = getTierInfo(requiredTier);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 min-h-[400px] border-2 border-dashed rounded-lg bg-muted/30">
      <div className="p-4 bg-muted rounded-full">
        <Lock className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-bold">Feature Locked</h3>
        <p className="text-muted-foreground">
          This feature requires the{" "}
          <span
            className={`font-semibold ${tierInfo?.color || "text-primary"}`}
          >
            {tierInfo?.name || "higher"}
          </span>{" "}
          plan or higher.
        </p>
      </div>
      <Button onClick={() => router.push("/settings?tab=subscription")}>
        Upgrade Plan
      </Button>
    </div>
  );
}
