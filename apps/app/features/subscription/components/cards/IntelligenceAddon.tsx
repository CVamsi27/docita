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
import { getFeatureDetails } from "../../config/feature-config";

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
    <Card className="relative overflow-hidden border-2 border-pink-300/50 bg-linear-to-br from-pink-50 via-purple-50/50 to-background dark:from-pink-950/30 dark:via-purple-950/20 dark:to-slate-900/50 dark:border-pink-700/30">
      {/* Decorative gradient blurs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-pink-500/10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 dark:bg-purple-500/10" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 to-purple-600 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <Badge className="bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30">
                AI-Powered
              </Badge>
            </div>
            <CardTitle className="text-xl text-pink-700 dark:text-pink-300">
              Docita Intelligence
            </CardTitle>
            <CardDescription className="text-pink-600/80 dark:text-pink-400/70">
              AI-Powered Add-on available for any tier
            </CardDescription>
          </div>
          <Button className="bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg">
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
                className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-pink-200/50 dark:border-pink-800/30 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50 shrink-0">
                  <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-pink-900 dark:text-pink-100">
                    {details.name}
                  </p>
                  <p className="text-xs text-pink-600/70 dark:text-pink-400/60 line-clamp-2">
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
