"use client";

import type { ReactNode } from "react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  CategoryAvatar,
  type CategoryAvatarTone,
} from "@workspace/ui/components/indicators/category-avatar";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Shared scaffolding for the clinic onboarding wizard so every step renders the
 * same card surface, header band, and footer navigation. Compose as:
 *
 *   <OnboardingStepCard>
 *     <OnboardingStepHeader stepNumber={n} eyebrow="…" title="…" icon={…} />
 *     <OnboardingStepBody>…form…</OnboardingStepBody>
 *     <OnboardingStepFooter primary={{…}} back={{…}} />
 *   </OnboardingStepCard>
 */

export const ONBOARDING_TOTAL_STEPS = 5;

export function OnboardingStepCard({
  className,
  children,
  ...rest
}: React.ComponentProps<"div">) {
  return (
    // Zero out the card's intrinsic padding/gap so the header and footer bands
    // sit flush against the rounded edges.
    <Card
      className={cn("gap-0 overflow-hidden py-0 ring-1 ring-border/25", className)}
      {...rest}
    >
      {children}
    </Card>
  );
}

interface OnboardingStepHeaderProps {
  stepNumber: number;
  totalSteps?: number;
  /** Short section label shown in the eyebrow, e.g. "Visit hours". */
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  /** A lucide icon element, e.g. <Calendar strokeWidth={1.5} />. */
  icon: ReactNode;
  tone?: CategoryAvatarTone;
}

export function OnboardingStepHeader({
  stepNumber,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  eyebrow,
  title,
  description,
  icon,
  tone = "primary",
}: OnboardingStepHeaderProps) {
  return (
    <div className="flex items-start gap-3.5 border-b border-border/60 bg-surface-2 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
      <CategoryAvatar icon={icon} tone={tone} size="lg" className="mt-0.5" />
      <div className="min-w-0 space-y-1.5">
        <MicroLabel as="h2">
          {`Step ${stepNumber} of ${totalSteps} · ${eyebrow}`}
        </MicroLabel>
        <CardTitle className="text-[length:var(--fs-xl)] font-semibold tracking-tight sm:text-[length:var(--fs-2xl)]">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="max-w-prose text-pretty text-[length:var(--fs-sm)] sm:text-[length:var(--fs-base)]">
            {description}
          </CardDescription>
        ) : null}
      </div>
    </div>
  );
}

export function OnboardingStepBody({
  className,
  children,
  ...rest
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-4 py-5 sm:px-6 sm:py-6", className)} {...rest}>
      {children}
    </div>
  );
}

interface OnboardingNavAction {
  label: string;
  onClick?: () => void;
}

interface OnboardingPrimaryAction {
  label: string;
  onClick?: () => void;
  /** Associates the button with a form id so `type="submit"` works outside it. */
  form?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

interface OnboardingStepFooterProps {
  /** Omit on steps that advance via an in-body action (e.g. plan selection). */
  primary?: OnboardingPrimaryAction;
  back?: OnboardingNavAction;
  skip?: OnboardingNavAction;
  /** Rendered above the buttons (e.g. a "complete before continuing" checklist). */
  extra?: ReactNode;
}

export function OnboardingStepFooter({
  primary,
  back,
  skip,
  extra,
}: OnboardingStepFooterProps) {
  const hasSecondary = Boolean(back || skip);
  // With no primary, left-align the secondary controls; otherwise push them apart.
  const justify = primary
    ? hasSecondary
      ? "sm:justify-between"
      : "sm:justify-end"
    : "sm:justify-start";
  return (
    <div className="space-y-4 border-t border-border/60 bg-muted/[0.06] px-4 py-4 sm:px-6">
      {extra}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:items-center",
          justify,
        )}
      >
        {hasSecondary ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {back ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={back.onClick}
              >
                {back.label}
              </Button>
            ) : null}
            {skip ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={skip.onClick}
              >
                {skip.label}
              </Button>
            ) : null}
          </div>
        ) : null}
        {primary ? (
          <Button
            type={primary.type ?? "button"}
            form={primary.form}
            onClick={primary.onClick}
            disabled={primary.disabled || primary.loading}
            className="h-11 w-full px-6 font-semibold sm:w-auto sm:min-w-[12rem]"
          >
            {primary.loading ? (
              <>
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
                {primary.loadingLabel ?? primary.label}
              </>
            ) : (
              primary.label
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
