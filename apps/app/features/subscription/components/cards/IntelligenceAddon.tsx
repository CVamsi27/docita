
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Feature, Tier } from "@/lib/tier-config";
import { getFeatureDetails } from "../../config/feature-config";

interface IntelligenceAddonProps {
  featuresByTier: Array<{
    tier: number;
    features: Array<{ feature: Feature; details: ReturnType<typeof getFeatureDetails> }>;
  }>;
}

export function IntelligenceAddon({ featuresByTier }: IntelligenceAddonProps) {
  const intelligenceFeatures = featuresByTier.find(
    (t) => t.tier === Tier.INTELLIGENCE,
  );

  return (
    <Card className="border-pink-200 bg-linear-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Docita Intelligence
            </CardTitle>
            <CardDescription>AI-Powered Add-on for any tier</CardDescription>
          </div>
          <Badge className="bg-pink-500 hover:bg-pink-600">AI Add-on</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {intelligenceFeatures?.features.map(({ feature, details }) => {
            const Icon = details.icon;
            return (
              <div key={feature} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50">
                  <Icon className="h-4 w-4 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{details.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {details.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
