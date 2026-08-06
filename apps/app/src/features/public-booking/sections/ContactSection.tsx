"use client";

import { UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, Input, Label, Textarea } from "@workspace/ui/components";
import { BookingSectionHeader } from "@/features/public-booking/public-booking-components";
import { bookingCardClass, bookingSectionHeaderBar, bookingSectionShell } from "@/features/public-booking/atoms/booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";
import { ContactSectionPhone } from "./contact-section-phone";
import { ContactSectionVerification } from "./contact-section-verification";
import { ContactSectionNewPatient } from "./contact-section-new-patient";

export function ContactSection({
  c,
  facilityWord,
  compactHeader = false,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
  compactHeader?: boolean;
}) {
  const requiredMark = (
    <span aria-hidden className="text-destructive">
      {" "}
      *
    </span>
  );

  return (
    <Card
      className={cn(bookingCardClass, bookingSectionShell, "flex flex-col")}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5",
        )}
      >
        <BookingSectionHeader
          icon={UserCircle}
          micro="How we reach you"
          title="Your contact details"
          description={
            <>
              Please use the same phone this {facilityWord.toLowerCase()} has on
              file when possible, so we can match your request to your chart.
            </>
          }
          tone="info"
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 sm:px-6 sm:py-6">
        <ContactSectionPhone c={c} requiredMark={requiredMark} />
        <ContactSectionVerification c={c} requiredMark={requiredMark} />
        <ContactSectionNewPatient c={c} requiredMark={requiredMark} />

        <div className="grid gap-2 sm:col-span-2">
          <Label
            htmlFor="pb-reason"
            className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
          >
            Reason for visit
          </Label>
          <Input
            id="pb-reason"
            value={c.reason}
            onChange={(e) => {
              c.setReason(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.reason;
                return next;
              });
            }}
            aria-invalid={c.submitFieldErrors.reason ? true : undefined}
            aria-describedby={
              c.submitFieldErrors.reason ? "pb-reason-error" : undefined
            }
          />
          {c.submitFieldErrors.reason ? (
            <p
              id="pb-reason-error"
              role="alert"
              className="text-[length:var(--fs-xs)] leading-snug text-destructive"
            >
              {c.submitFieldErrors.reason}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label
            htmlFor="pb-notes"
            className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
          >
            Notes for the team
          </Label>
          <Textarea
            id="pb-notes"
            value={c.notes}
            onChange={(e) => {
              c.setNotes(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.notes;
                return next;
              });
            }}
            placeholder="Enter notes for the team"
            maxLength={1000}
            aria-invalid={c.submitFieldErrors.notes ? true : undefined}
            aria-describedby={
              c.submitFieldErrors.notes ? "pb-notes-error" : undefined
            }
            className={cn(
              "min-h-[96px] rounded-[var(--radius-md)] border-border/80 bg-background text-[length:var(--fs-sm)] shadow-sm",
              c.submitFieldErrors.notes && "border-destructive",
            )}
          />
          {c.submitFieldErrors.notes ? (
            <p
              id="pb-notes-error"
              role="alert"
              className="text-[length:var(--fs-xs)] leading-snug text-destructive"
            >
              {c.submitFieldErrors.notes}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
