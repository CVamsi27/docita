"use client";

import type { ReactNode } from "react";
import { DPDP_NOTICE_TEXT_PATIENT, DPDP_NOTICE_TITLE } from "@workspace/types";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Input } from "@workspace/ui/components/form/input";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { Label } from "@workspace/ui/components/form/label";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

export function ContactSectionNewPatient({
  c,
  requiredMark,
}: {
  c: PublicBookingPageController;
  requiredMark: ReactNode;
}) {
  if (c.requiresOtp !== false) {
    return null;
  }

  return (
    <>
      <div className="grid gap-2">
        <Label
          htmlFor="pb-first-name"
          className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
        >
          First name{requiredMark}
        </Label>
        <Input
          id="pb-first-name"
          value={c.firstName}
          onChange={(e) => {
            c.setFirstName(e.target.value);
            c.setSubmitFieldErrors((prev) => {
              const next = { ...prev };
              delete next.firstName;
              return next;
            });
          }}
          autoComplete="given-name"
          aria-invalid={c.submitFieldErrors.firstName ? true : undefined}
          aria-describedby={
            c.submitFieldErrors.firstName ? "pb-first-name-error" : undefined
          }
        />
        {c.submitFieldErrors.firstName ? (
          <p
            id="pb-first-name-error"
            role="alert"
            className="text-[length:var(--fs-xs)] leading-snug text-destructive"
          >
            {c.submitFieldErrors.firstName}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label
          htmlFor="pb-last-name"
          className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
        >
          Last name{requiredMark}
        </Label>
        <Input
          id="pb-last-name"
          value={c.lastName}
          onChange={(e) => {
            c.setLastName(e.target.value);
            c.setSubmitFieldErrors((prev) => {
              const next = { ...prev };
              delete next.lastName;
              return next;
            });
          }}
          autoComplete="family-name"
          aria-invalid={c.submitFieldErrors.lastName ? true : undefined}
          aria-describedby={
            c.submitFieldErrors.lastName ? "pb-last-name-error" : undefined
          }
        />
        {c.submitFieldErrors.lastName ? (
          <p
            id="pb-last-name-error"
            role="alert"
            className="text-[length:var(--fs-xs)] leading-snug text-destructive"
          >
            {c.submitFieldErrors.lastName}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <IsoDatePickerField
          id="pb-date-of-birth"
          label="Date of birth"
          requiredMark
          value={c.dateOfBirth}
          onChange={(iso) => {
            c.setDateOfBirth(iso);
            c.setSubmitFieldErrors((prev) => {
              const next = { ...prev };
              delete next.dateOfBirth;
              return next;
            });
          }}
          placeholder="Select date of birth"
          required
          triggerClassName={cn(
            "w-full sm:w-full",
            c.submitFieldErrors.dateOfBirth && "border-destructive",
          )}
        />
        {c.submitFieldErrors.dateOfBirth ? (
          <p
            id="pb-date-of-birth-error"
            role="alert"
            className="mt-1 text-[length:var(--fs-xs)] leading-snug text-destructive"
          >
            {c.submitFieldErrors.dateOfBirth}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label
          htmlFor="pb-email"
          className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
        >
          Email
        </Label>
        <Input
          id="pb-email"
          value={c.email}
          onChange={(e) => {
            c.setEmail(e.target.value);
            c.setSubmitFieldErrors((prev) => {
              const next = { ...prev };
              delete next.email;
              return next;
            });
          }}
          autoComplete="email"
          type="email"
          aria-invalid={c.submitFieldErrors.email ? true : undefined}
          aria-describedby={
            c.submitFieldErrors.email ? "pb-email-error" : undefined
          }
        />
        {c.submitFieldErrors.email ? (
          <p
            id="pb-email-error"
            role="alert"
            className="text-[length:var(--fs-xs)] leading-snug text-destructive"
          >
            {c.submitFieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/30 p-4 sm:col-span-2">
        <p className="text-[length:var(--fs-sm)] font-semibold text-foreground">
          {DPDP_NOTICE_TITLE}
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        </p>
        <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
          {DPDP_NOTICE_TEXT_PATIENT}
        </p>
        <label
          htmlFor="pb-dpdp-consent"
          className="mt-2 flex cursor-pointer items-start gap-2 text-[length:var(--fs-sm)]"
        >
          <Checkbox
            id="pb-dpdp-consent"
            checked={c.dpdpConsentAccepted}
            onCheckedChange={(checked) => {
              c.setDpdpConsentAccepted(checked === true);
            }}
          />
          <span>
            I have read this notice and consent to my personal and health data
            being processed per the description above.
          </span>
        </label>
      </div>
    </>
  );
}
