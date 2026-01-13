import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Tier, TierInfo } from "@/lib/tier-config";
import { PlanFeatures } from "./PlanFeatures";

interface TierCardProps {
  tier: Tier;
  info: TierInfo;
  features: any[]; // Using specific type from PlanFeatures or just pass generic array
  isCurrentTier: boolean;
  isLocked: boolean;
  className?: string;
}

export function TierCard({
  tier,
  info,
  features,
  isCurrentTier,
  isLocked,
  className,
}: TierCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        isCurrentTier && "border-primary ring-2 ring-primary/20",
        isLocked && "opacity-75",
        className,
      )}
    >
      {isCurrentTier && (
        <div className="absolute top-0 right-0 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-bl-lg">
          Current
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              info.color === "gray" && "bg-gray-500",
              info.color === "blue" && "bg-blue-500",
              info.color === "green" && "bg-green-500",
              info.color === "purple" && "bg-purple-500",
              info.color === "orange" && "bg-orange-500",
            )}
          />
          <CardTitle className="text-base">{info.name}</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {info.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <PlanFeatures features={features} maxDisplay={5} />
      </CardContent>
    </Card>
  );
}
