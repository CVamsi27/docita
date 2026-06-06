import { ArrowRight, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Feature, getTierInfo } from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";

interface NextTierPromotionProps {
  nextTier: number;
  featuresByTier: Array<{
    tier: number;
    features: Array<{
      feature: Feature;
      details: ReturnType<typeof getFeatureDetails>;
    }>;
  }>;
  onContactSales: () => void;
}
export function NextTierPromotion({
  nextTier,
  featuresByTier,
  onContactSales,
}: NextTierPromotionProps) {
  const nextTierInfo = getTierInfo(nextTier);
  const nextTierFeatures = featuresByTier.find((t) => t.tier === nextTier);
  if (!nextTierInfo) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 dark:bg-primary/30">
                <Zap className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            </div>
            <CardTitle className="flex items-center gap-2 text-xl">
              Upgrade to {nextTierInfo.name}
              <ArrowRight className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription className="text-base">
              {nextTierInfo.description}
            </CardDescription>
          </div>
          <Button
            onClick={onContactSales}
            className="shadow-sm"
          >
            Upgrade Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Unlock these features:
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {nextTierFeatures?.features
            .slice(0, 6)
            .map(({ feature, details }) => {
              const Icon = details.icon;
              return (
                <div
                  key={feature}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 dark:bg-muted/50 border border-border/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/70 dark:bg-background/70">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{details.name}</span>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}