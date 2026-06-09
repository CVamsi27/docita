"use client";

import type { ReactNode } from "react";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { ContactTextField } from "./contact-text-field";
import { ContactDateOfBirthField } from "./contact-date-of-birth-field";
import { DpdpConsentNotice } from "./dpdp-consent-notice";
import {
  clearContactSubmitFieldError,
  createContactFieldChangeHandler,
} from "./contact-section-new-patient-helpers";

export function ContactSectionNewPatient({
  c,
  requiredMark,
}: {
  c: PublicBookingPageController;
  requiredMark: ReactNode;
}) {
  if (c.requiresOtp !== false) return null;

  const onTextFieldChange = createContactFieldChangeHandler(c.setSubmitFieldErrors);

  return (
    <>
      <ContactTextField
        id="pb-first-name"
        label={<>First name{requiredMark}</>}
        value={c.firstName}
        error={c.submitFieldErrors.firstName}
        onValueChange={onTextFieldChange("firstName", c.setFirstName)}
        autoComplete="given-name"
      />

      <ContactTextField
        id="pb-last-name"
        label={<>Last name{requiredMark}</>}
        value={c.lastName}
        error={c.submitFieldErrors.lastName}
        onValueChange={onTextFieldChange("lastName", c.setLastName)}
        autoComplete="family-name"
      />

      <ContactDateOfBirthField
        value={c.dateOfBirth}
        error={c.submitFieldErrors.dateOfBirth}
        onValueChange={(iso) => {
          c.setDateOfBirth(iso);
          clearContactSubmitFieldError(c.setSubmitFieldErrors, "dateOfBirth");
        }}
      />

      <ContactTextField
        id="pb-email"
        label="Email"
        value={c.email}
        error={c.submitFieldErrors.email}
        onValueChange={onTextFieldChange("email", c.setEmail)}
        autoComplete="email"
        type="email"
        wrapperClassName="grid gap-2 sm:col-span-2"
      />

      <DpdpConsentNotice
        checked={c.dpdpConsentAccepted}
        onCheckedChange={c.setDpdpConsentAccepted}
      />
    </>
  );
}
