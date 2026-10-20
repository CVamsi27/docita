"use client";

import type { FC } from "react";
import { ChevronDown } from "lucide-react";
import { Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { ComparisonTable } from "@/features/subscription";

// ---------------------------------------------------------------------------
// BillingCycleToggle
// ---------------------------------------------------------------------------

interface BillingCycleToggleProps {
  billingCycle: "MONTHLY" | "YEARLY";
  onChange: (cycle: "MONTHLY" | "YEARLY") => void;
}

export const BillingCycleToggle: FC<BillingCycleToggleProps> = ({
  billingCycle,
  onChange,
}) => (
  <div className="flex justify-center">
    <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={billingCycle === "MONTHLY" ? "default" : "ghost"}
        size="sm"
        aria-pressed={billingCycle === "MONTHLY"}
        onClick={() => onChange("MONTHLY")}
      >
        Monthly
      </Button>
      <Button
        variant={billingCycle === "YEARLY" ? "default" : "ghost"}
        size="sm"
        aria-pressed={billingCycle === "YEARLY"}
        onClick={() => onChange("YEARLY")}
      >
        Yearly{" "}
        <Badge variant="secondary" className="ml-1">
          2 months free
        </Badge>
      </Button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// PlanComparisonCollapsible
// ---------------------------------------------------------------------------

interface PlanComparisonCollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlanComparisonCollapsible: FC<PlanComparisonCollapsibleProps> = ({
  open,
  onOpenChange,
}) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        className="w-full justify-between border border-border/50 rounded-lg px-4 py-3 h-auto"
      >
        <span className="text-sm font-medium">Compare all plans</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <ComparisonTable currentTier={0} />
    </CollapsibleContent>
  </Collapsible>
);
