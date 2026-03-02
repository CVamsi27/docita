import { Sparkles, Wand2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Feature, Tier } from "@/lib/tier-config";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";

interface IntelligenceAddonProps {
  featuresByTier: Array<{
    tier: number;
    features: Array<{
      feature: Feature;
      details: ReturnType<typeof getFeatureDetails>;
    }>;
  }>;
}

export function IntelligenceAddon({ featuresByTier }: IntelligenceAddonProps) {
  const intelligenceFeatures = featuresByTier.find(
    (t) => t.tier === Tier.INTELLIGENCE,
  );

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-linear-to-br from-background via-primary/10 to-background">
      {}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge className="tier-intelligence border">
                AI-Powered
              </Badge>
            </div>
            <CardTitle className="text-xl text-primary">
              Docita Intelligence
            </CardTitle>
            <CardDescription className="text-primary/80">
              AI-Powered Add-on available for any tier
            </CardDescription>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
            <Wand2 className="mr-2 h-4 w-4" />
            Add Intelligence
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intelligenceFeatures?.features.map(({ feature, details }) => {
            const Icon = details.icon;
            return (
              <div
                key={feature}
                className="flex items-start gap-3 p-3 rounded-xl bg-background/70 border border-primary/20 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {details.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
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
