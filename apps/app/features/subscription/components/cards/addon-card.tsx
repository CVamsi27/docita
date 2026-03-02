import { useState } from "react";
import { Check, Loader2, LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Feature } from "@/lib/tier-config";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";

export interface AddonPricing {
  monthly: number;
  yearly?: number;
}

export type AddonColorScheme = "pink" | "green" | "blue" | "purple";

export interface AddonFeature {
  feature: Feature;
  details: ReturnType<typeof getFeatureDetails>;
}

interface AddonCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  colorScheme: AddonColorScheme;
  features: AddonFeature[];
  pricing?: AddonPricing;
  isPurchased: boolean;
  isLoading?: boolean;
  onPurchase: (cycle: "MONTHLY" | "YEARLY") => void;
  currency?: string;
}

const COLOR_VARIANTS: Record<
  AddonColorScheme,
  {
    card: string;
    icon: string;
    badge: string;
    title: string;
    desc: string;
    button: string;
    featureIcon: string;
    featureText: string;
    featureDesc: string;
    featureBg: string;
    border: string;
  }
> = {
  pink: {
    card: "from-background via-primary/10 to-background",
    icon: "bg-primary text-primary-foreground",
    badge: "tier-pro",
    title: "text-primary",
    desc: "text-primary/80",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
    featureIcon: "text-primary",
    featureText: "text-foreground",
    featureDesc: "text-muted-foreground",
    featureBg: "bg-background/60 border border-primary/20",
    border: "border-primary/30",
  },
  green: {
    card: "from-background via-success/10 to-background",
    icon: "bg-success text-success-foreground",
    badge: "tier-plus",
    title: "text-success",
    desc: "text-success/80",
    button: "bg-success text-success-foreground hover:bg-success/90",
    featureIcon: "text-success",
    featureText: "text-foreground",
    featureDesc: "text-muted-foreground",
    featureBg: "bg-background/60 border border-success/20",
    border: "border-success/30",
  },
  blue: {
    card: "from-background via-info/10 to-background",
    icon: "bg-info text-info-foreground",
    badge: "tier-core",
    title: "text-info",
    desc: "text-info/80",
    button: "bg-info text-info-foreground hover:bg-info/90",
    featureIcon: "text-info",
    featureText: "text-foreground",
    featureDesc: "text-muted-foreground",
    featureBg: "bg-background/60 border border-info/20",
    border: "border-info/30",
  },
  purple: {
    card: "from-background via-warning/10 to-background",
    icon: "bg-warning text-warning-foreground",
    badge: "tier-enterprise",
    title: "text-warning",
    desc: "text-warning/80",
    button: "btn-warning",
    featureIcon: "text-warning",
    featureText: "text-foreground",
    featureDesc: "text-muted-foreground",
    featureBg: "bg-background/60 border border-warning/20",
    border: "border-warning/30",
  },
};

export function AddonCard({
  title,
  description,
  icon: Icon,
  colorScheme,
  features,
  pricing,
  isPurchased,
  isLoading = false,
  onPurchase,
  currency = "INR",
}: AddonCardProps) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const colors = COLOR_VARIANTS[colorScheme];

  const price = billingCycle === "MONTHLY" ? pricing?.monthly : pricing?.yearly;
  const currencySymbol =
    currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 bg-linear-to-br transition-all",
        colors.card,
        colors.border,
      )}
    >
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                  colors.icon,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <Badge className={cn("border", colors.badge)}>Add-on</Badge>
            </div>
            <CardTitle className={cn("text-xl", colors.title)}>
              {title}
            </CardTitle>
            <CardDescription className={colors.desc}>
              {description}
            </CardDescription>
          </div>

          <div className="flex flex-col items-end gap-3">
            {!isPurchased && pricing && (
              <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                <Button
                  variant={billingCycle === "MONTHLY" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className="h-7 text-xs"
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "YEARLY" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setBillingCycle("YEARLY")}
                  className="h-7 text-xs"
                >
                  Yearly
                </Button>
              </div>
            )}

            <div className="flex items-center gap-4">
              {!isPurchased && price !== undefined && (
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", colors.title)}>
                    {currencySymbol}
                    {price.toLocaleString()}
                  </div>
                  <div className={cn("text-xs", colors.desc)}>
                    per {billingCycle === "MONTHLY" ? "month" : "year"}
                  </div>
                </div>
              )}

              <Button
                disabled={isPurchased || isLoading}
                onClick={() => onPurchase(billingCycle)}
                className={cn("shadow-lg min-w-[140px]", colors.button)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isPurchased ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Active
                  </>
                ) : (
                  <>Add {title}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ feature, details }) => {
            const FeatureIcon = details.icon;
            return (
              <div
                key={feature}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl backdrop-blur-sm",
                  colors.featureBg,
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 shrink-0">
                  <FeatureIcon className={cn("h-4 w-4", colors.featureIcon)} />
                </div>
                <div>
                  <p className={cn("text-sm font-medium", colors.featureText)}>
                    {details.name}
                  </p>
                  <p className={cn("text-xs line-clamp-2", colors.featureDesc)}>
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
