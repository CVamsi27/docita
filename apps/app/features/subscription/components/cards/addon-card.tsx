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
    card: "from-pink-50 via-purple-50/50 to-background dark:from-pink-950/30 dark:via-purple-950/20 dark:to-slate-900/50",
    icon: "from-pink-500 to-purple-600",
    badge: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30",
    title: "text-pink-700 dark:text-pink-300",
    desc: "text-pink-600/80 dark:text-pink-400/70",
    button:
      "bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700",
    featureIcon: "text-pink-600 dark:text-pink-400",
    featureText: "text-pink-900 dark:text-pink-100",
    featureDesc: "text-pink-600/70 dark:text-pink-400/60",
    featureBg:
      "bg-white/60 dark:bg-slate-800/50 border border-pink-200/50 dark:border-pink-800/30",
    border: "border-pink-300/50 dark:border-pink-700/30",
  },
  green: {
    card: "from-emerald-50 via-green-50/50 to-background dark:from-emerald-950/30 dark:via-green-950/20 dark:to-slate-900/50",
    icon: "from-emerald-500 to-teal-600",
    badge:
      "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    title: "text-emerald-700 dark:text-emerald-300",
    desc: "text-emerald-600/80 dark:text-emerald-400/70",
    button:
      "bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
    featureIcon: "text-emerald-600 dark:text-emerald-400",
    featureText: "text-emerald-900 dark:text-emerald-100",
    featureDesc: "text-emerald-600/70 dark:text-emerald-400/60",
    featureBg:
      "bg-white/60 dark:bg-slate-800/50 border border-emerald-200/50 dark:border-emerald-800/30",
    border: "border-emerald-300/50 dark:border-emerald-700/30",
  },
  blue: {
    card: "from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/50",
    icon: "from-blue-500 to-indigo-600",
    badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    title: "text-blue-700 dark:text-blue-300",
    desc: "text-blue-600/80 dark:text-blue-400/70",
    button:
      "bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
    featureIcon: "text-blue-600 dark:text-blue-400",
    featureText: "text-blue-900 dark:text-blue-100",
    featureDesc: "text-blue-600/70 dark:text-blue-400/60",
    featureBg:
      "bg-white/60 dark:bg-slate-800/50 border border-blue-200/50 dark:border-blue-800/30",
    border: "border-blue-300/50 dark:border-blue-700/30",
  },
  purple: {
    card: "from-violet-50 via-purple-50/50 to-background dark:from-violet-950/30 dark:via-purple-950/20 dark:to-slate-900/50",
    icon: "from-violet-500 to-purple-600",
    badge:
      "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
    title: "text-violet-700 dark:text-violet-300",
    desc: "text-violet-600/80 dark:text-violet-400/70",
    button:
      "bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
    featureIcon: "text-violet-600 dark:text-violet-400",
    featureText: "text-violet-900 dark:text-violet-100",
    featureDesc: "text-violet-600/70 dark:text-violet-400/60",
    featureBg:
      "bg-white/60 dark:bg-slate-800/50 border border-violet-200/50 dark:border-violet-800/30",
    border: "border-violet-300/50 dark:border-violet-700/30",
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
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br shadow-lg",
                  colors.icon,
                )}
              >
                <Icon className="h-5 w-5 text-white" />
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/50 dark:bg-black/20 shrink-0">
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
