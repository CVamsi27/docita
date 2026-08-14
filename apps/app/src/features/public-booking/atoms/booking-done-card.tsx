"use client";

import { CheckCircle2, MapPin, Phone } from "lucide-react";
import { Button, Card, CardContent, MicroLabel } from "@workspace/ui/components";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { bookingCardClass, bookingSectionShell } from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingDoneCard({
  clinicName,
  facilityWord,
  phone,
  address,
}: {
  clinicName: string;
  facilityWord: string;
  phone?: string | null;
  address?: string | null;
}) {
  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "mx-auto w-full max-w-md overflow-hidden text-center",
      )}
    >
      <div
        className="pointer-events-none h-1.5 w-full bg-gradient-to-r from-success/60 via-success to-success/60"
        aria-hidden
      />
      <CardContent className="space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="relative mx-auto w-fit" aria-hidden>
          <div className="absolute inset-0 scale-110 rounded-full bg-success/20 blur-md" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-success/25 bg-success/[0.1] text-success shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
            <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <MicroLabel as="p" className="mt-0 text-success/80">
            Request sent
          </MicroLabel>
          <h2 className="font-serif text-[length:var(--fs-2xl)] font-semibold tracking-tight text-foreground sm:text-[length:var(--fs-3xl)]">
            You&apos;re all set
          </h2>
          <p className="mx-auto max-w-sm text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            The care team will reach out to confirm your visit using the contact
            method they have on file.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-4 py-4 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <CategoryAvatar
              icon={<MapPin strokeWidth={1.5} />}
              tone="primary"
              size="sm"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <MicroLabel as="p" className="mt-0">
                {facilityWord}
              </MicroLabel>
              <p className="font-medium text-[length:var(--fs-base)] text-foreground leading-snug">
                {clinicName}
              </p>
              {address ? (
                <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  {address}
                </p>
              ) : null}
            </div>
          </div>
          {phone ? (
            <Button
              variant="outline"
              className="mt-4 h-10 w-full rounded-[var(--radius-md)]"
              asChild
            >
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 transition-colors duration-150"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                Call {clinicName}
              </a>
            </Button>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-md)] border border-border/50 bg-background px-4 py-3 text-left shadow-sm">
          <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
            What happens next
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              "The clinic reviews your request",
              "They contact you to confirm the time",
              "Your visit is confirmed once they reach out",
            ].map((step) => (
              <li
                key={step}
                className="flex items-start gap-2 text-[length:var(--fs-xs)] leading-snug text-muted-foreground"
              >
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/70"
                  aria-hidden
                />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
