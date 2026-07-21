"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardDescription, CardTitle, MicroLabel } from "@workspace/ui/components";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { cn } from "@workspace/ui/lib/utils";

export function BookingSectionHeader({
  icon: Icon,
  micro,
  title,
  description,
  tone = "primary",
  variant = "full",
}: {
  icon: LucideIcon;
  micro: string;
  title: string;
  description: ReactNode;
  tone?: "info" | "success" | "warning" | "destructive" | "primary" | "neutral";
  variant?: "full" | "compact";
}) {
  const isCompact = variant === "compact";
  return (
    <div
      className={cn("flex", isCompact ? "gap-3 sm:gap-3" : "gap-3.5 sm:gap-4")}
    >
      <CategoryAvatar
        icon={<Icon strokeWidth={1.5} />}
        tone={tone}
        size={isCompact ? "md" : "lg"}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 space-y-1">
        <MicroLabel as="h3">{micro}</MicroLabel>
        {isCompact ? null : (
          <CardTitle className="text-[length:var(--fs-xl)] font-semibold tracking-tight sm:text-[length:var(--fs-2xl)]">
            {title}
          </CardTitle>
        )}
        <CardDescription
          className={cn(
            "max-w-prose text-pretty",
            isCompact
              ? "text-[length:var(--fs-xs)] leading-relaxed sm:text-[length:var(--fs-sm)]"
              : "text-[length:var(--fs-sm)] sm:text-[length:var(--fs-base)]",
          )}
        >
          {description}
        </CardDescription>
      </div>
    </div>
  );
}
