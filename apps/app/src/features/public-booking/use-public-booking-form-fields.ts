"use client";

import { useState } from "react";

export function usePublicBookingFormFields(siteKey: string | undefined) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dpdpConsentAccepted, setDpdpConsentAccepted] = useState(false);

  return {
    turnstileToken, setTurnstileToken,
    firstName, setFirstName,
    lastName, setLastName,
    phone, setPhone,
    email, setEmail,
    dateOfBirth, setDateOfBirth,
    reason, setReason,
    notes, setNotes,
    dpdpConsentAccepted, setDpdpConsentAccepted,
    siteKey,
  };
}
