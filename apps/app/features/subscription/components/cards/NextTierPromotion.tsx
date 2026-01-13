
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Feature, getTierInfo } from "@/lib/tier-config";
import { getFeatureDetails } from "../../config/feature-config";

interface NextTierPromotionProps {
  nextTier: number;
  featuresByTier: Array<{
    tier: number;
    features: Array<{ feature: Feature; details: ReturnType<typeof getFeatureDetails> }>;
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
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Upgrade to {nextTierInfo.name}
              <ArrowRight className="h-5 w-5" />
            </CardTitle>
            <CardDescription>{nextTierInfo.description}</CardDescription>
          </div>
          <Button onClick={onContactSales}>Contact Sales</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {nextTierFeatures?.features.slice(0, 6).map(({ feature, details }) => {
            const Icon = details.icon;
            return (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                <span>{details.name}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
