import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

export const AnalyticsUpgradeState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <div className="w-full max-w-md mb-4 flex">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
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
      <Link href="/settings?tab=subscription">Upgrade to Pro</Link>
    </Button>
  </div>
);
