

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export interface PricingTierCardProps {
  tier: string;
  title: string;
  description: string;
  price: string;
  pricePerMonth?: string;
  billingNote?: string;
  features: string[];
  isPopular?: boolean;
  isPrimary?: boolean;
  badgeColor?: "slate" | "blue" | "green" | "purple" | "amber";
  buttonText?: string;
  buttonVariant?: "default" | "outline";
  onContactSales?: () => void;
  isEnterprise?: boolean;
}

const badgeColorMap = {
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  blue: "bg-info text-info dark:text-info",
  green: "bg-success text-success dark:text-success",
  purple: "bg-primary text-primary dark:text-primary",
  amber: "bg-warning text-warning dark:text-warning",
};

export function PricingTierCard({
  tier,
  title,
  description,
  price,
  pricePerMonth,
  billingNote,
  features,
  isPopular,
  isPrimary,
  badgeColor = "slate",
  buttonText = "Start 7 Day Free Trial",
  buttonVariant = "outline",
  onContactSales,
  isEnterprise,
}: PricingTierCardProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <Card
      className={`relative flex flex-col h-full transition-colors ${
        isPopular
          ? "border-primary shadow-lg scale-105 z-10 bg-background"
          : "border-muted hover:border-primary/50"
      } ${isPrimary ? "bg-linear-to-b from-background to-muted/30" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}

      <CardHeader className="pb-4">
        <div
          className={`inline-flex items-center gap-2 rounded-full ${badgeColorMap[badgeColor]} px-3 py-1 text-xs mb-2 w-fit`}
        >
          <span className="font-medium">{tier}</span>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>

        <div className="mt-3">
          <span className="text-3xl font-bold">{price}</span>
          {pricePerMonth && (
            <span className="text-muted-foreground text-sm">
              {pricePerMonth}
            </span>
          )}
          {billingNote && (
            <p className="text-xs text-muted-foreground mt-1">{billingNote}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ul className="space-y-2 text-sm">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {isEnterprise && onContactSales ? (
          <Button
            className="w-full"
            variant="outline"
            size="sm"
            onClick={onContactSales}
          >
            {buttonText}
          </Button>
        ) : (
          <Link href={`${appUrl}/onboarding`} className="w-full">
            <Button className="w-full" variant={buttonVariant} size="sm">
              {buttonText}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
