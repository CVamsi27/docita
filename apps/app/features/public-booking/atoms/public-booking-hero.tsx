"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import { PublicBookingTrustRow } from "./public-booking-trust-row";
import { PublicBookingHowItWorksSheet } from "./booking-how-it-works";

/** Desktop hero card: gradient banner with clinic name, badges, and trust indicators. */
export function PublicBookingHeroCompact({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/50 bg-card shadow-sm">
      {/* Accent bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
        aria-hidden
      />
      {/* Background tint */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.045] via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative grid grid-cols-[1fr_auto] items-start gap-x-8 gap-y-4 px-7 py-6 lg:px-8 lg:py-7">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide text-primary">
              Online booking
            </span>
            <Badge
              variant="secondary"
              className="normal-case text-[length:var(--fs-2xs)] font-medium"
            >
              {facilityLabel}
            </Badge>
          </div>
          <h1 className="font-serif text-[length:var(--fs-3xl)] font-semibold leading-tight tracking-tight text-foreground">
            {clinicName}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            <span>
              Fill in the steps below to request a visit. Staff confirm before
              it&apos;s final.
            </span>
            <PublicBookingHowItWorksSheet appearance="inline" />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <PublicBookingTrustRow className="flex-col items-end gap-x-0 gap-y-1.5" />
        </div>
      </div>
    </div>
  );
}
