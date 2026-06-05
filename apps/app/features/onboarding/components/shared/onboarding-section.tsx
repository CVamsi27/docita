"use client";

import type { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface OnboardingSectionProps {
  title: ReactNode;
  /** Optional lucide icon element shown before the title, e.g. <ShieldCheck />. */
  icon?: ReactNode;
  /** Optional trailing slot, e.g. a Badge or status pill. */
  trailing?: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * One labeled panel used inside onboarding steps (currently the three compliance
 * sub-sections) so they share a single container + header treatment.
 */
export function OnboardingSection({
  title,
  icon,
  trailing,
  description,
  className,
  children,
}: OnboardingSectionProps) {
  return (
    <section className={cn("ui-panel space-y-3 p-4 md:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">
                {icon}
              </span>
            ) : null}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {children}
    </section>
  );
}
