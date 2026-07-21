"use client";

import { Building2, Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MicroLabel
} from "@workspace/ui/components";
import {
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";
import type { PublicBookingClinicResponse } from "@workspace/types";

export function ClinicContactCard({
  clinic,
  className,
}: {
  clinic: PublicBookingClinicResponse;
  className?: string;
}) {
  const websiteHref = clinic.website
    ? clinic.website.startsWith("http")
      ? clinic.website
      : `https://${clinic.website}`
    : null;

  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col",
        className,
      )}
    >
      <CardHeader className={cn(bookingSectionHeaderBar, "py-3.5 sm:py-4")}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-primary/20 bg-primary/[0.08] text-primary">
            <MapPin className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <MicroLabel as="h2" className="mt-0">
              Your location
            </MicroLabel>
            <CardTitle className="mt-0.5 truncate text-[length:var(--fs-base)] leading-snug tracking-tight">
              {clinic.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 py-3.5 sm:px-4 sm:py-4">
        {clinic.address ? (
          <div className="flex items-start gap-2.5">
            <Building2
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              {clinic.address}
            </p>
          </div>
        ) : null}
        {clinic.phone ? (
          <div className="flex items-center gap-2.5">
            <Phone
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <a
              href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
              className="text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.phone}
            </a>
          </div>
        ) : null}
        {clinic.email ? (
          <div className="flex items-center gap-2.5">
            <Mail
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <a
              href={`mailto:${clinic.email}`}
              className="min-w-0 truncate text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.email}
            </a>
          </div>
        ) : null}
        {clinic.website && websiteHref ? (
          <div className="flex items-center gap-2.5">
            <Globe
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.website}
            </a>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <Clock
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">
            {clinic.timezone}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
