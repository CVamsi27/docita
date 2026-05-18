import { Button } from "@workspace/ui/components/button";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/common/navigation/back-button";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export const AnalyticsUpgradeState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <div className="w-full max-w-md mb-4 flex">
      <BackButton fallback="/dashboard" label="Back to Dashboard" />
    </div>
    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
    <h2 className="text-2xl font-semibold mb-2">
      Advanced Analytics Dashboard
    </h2>
    <p className="text-muted-foreground mb-4 max-w-md">
      Get comprehensive insights into your facility performance with advanced
      analytics, disease trends, revenue analysis, and compliance metrics.
      Available for Pro and Enterprise tiers.
    </p>
    <Button asChild>
      <Link href={SUBSCRIPTION_SETTINGS_PATH}>Upgrade to Pro</Link>
    </Button>
  </div>
);
