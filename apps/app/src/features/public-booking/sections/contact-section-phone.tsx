"use client";

import type { ReactNode } from "react";
import { Button, Input, Label } from "@workspace/ui/components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
export function ContactSectionPhone({
  c,
  requiredMark,
}: {
  c: PublicBookingPageController;
  requiredMark: ReactNode;
}) {
  const phoneChecked = c.requiresOtp !== null;
  return (
    <div className="grid gap-2 sm:col-span-2">
      <Label
        htmlFor="pb-phone"
        className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
      >
        Phone number{requiredMark}
      </Label>
      <Input
        id="pb-phone"
        value={c.phone}
        onChange={(e) => {
          c.setPhone(e.target.value);
          c.setRequiresOtp(null);
          c.setVerificationToken(null);
          c.setDateOfBirth("");
          c.setFirstName("");
          c.setLastName("");
          c.setEmail("");
          c.setSubmitFieldErrors((prev) => {
            const next = { ...prev };
            delete next.phoneNumber;
            delete next.bookingVerificationToken;
            return next;
          });
        }}
        autoComplete="tel"
        inputMode="tel"
        aria-invalid={c.submitFieldErrors.phoneNumber ? true : undefined}
        aria-describedby={
          c.submitFieldErrors.phoneNumber ? "pb-phone-error" : undefined
        }
      />
      {c.submitFieldErrors.phoneNumber ? (
        <p
          id="pb-phone-error"
          role="alert"
          className="text-[length:var(--fs-xs)] leading-snug text-destructive"
        >
          {c.submitFieldErrors.phoneNumber}
        </p>
      ) : null}
      {!phoneChecked ? (
        <Button
          type="button"
          className="mt-2 h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold"
          onClick={() => void c.runPhoneCheck()}
          disabled={!c.phone.trim() || c.phoneCheck.isPending}
        >
          Continue
        </Button>
      ) : null}
    </div>
  );
}