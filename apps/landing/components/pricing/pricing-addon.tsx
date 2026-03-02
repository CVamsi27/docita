

import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export interface PricingAddonProps {
  icon: ReactNode;
  title: string;
  description: string;
  price: string;
  priceNote?: string;
  features: Array<{
    label: string;
    icon: ReactNode;
  }>;
  iconBgColor: "green" | "primary";
}

const bgColorMap = {
  green: "from-success/5 via-background to-success/10",
  primary: "from-primary/5 via-background to-info/5",
};

const borderColorMap = {
  green: "border-success/30",
  primary: "border-primary/30",
};

const accentColorMap = {
  green: "from-success to-success/80",
  primary: "from-primary to-primary/80",
};

export function PricingAddon({
  icon,
  title,
  description,
  price,
  priceNote,
  features,
  iconBgColor,
}: PricingAddonProps) {
  return (
    <Card
      className={`relative overflow-hidden border-2 border-dashed ${borderColorMap[iconBgColor]} bg-linear-to-br ${bgColorMap[iconBgColor]}`}
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-bl ${
          iconBgColor === "green" ? "from-success/10" : "from-primary/10"
        } to-transparent`}
      />

      <CardHeader className="pb-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`rounded-xl bg-linear-to-br ${accentColorMap[iconBgColor]} p-3`}
          >
            <div className="h-6 w-6 text-primary-foreground">{icon}</div>
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>

        <div className="mt-3">
          <span className="text-2xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
          {priceNote && (
            <span className="text-xs text-muted-foreground ml-2">
              {priceNote}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-2 mt-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className={`${
                  iconBgColor === "green" ? "text-success" : "text-primary"
                } shrink-0`}
              >
                {feature.icon}
              </div>
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
