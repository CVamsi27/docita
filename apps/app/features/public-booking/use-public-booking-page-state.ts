"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPickerIsoDate } from "@workspace/utils";
import {
  usePublicBookingClinic,
  usePublicBookingContext,
  usePublicBookingDoctors,
  usePublicBookingSlots,
} from "@workspace/data-access";
import {
  ANY_DOCTOR_ID,
  type PublicBookingMobileStep,
  PUBLIC_BOOKING_SUBMIT_FIELD_KEYS,
} from "@/features/public-booking/public-booking-constants";
import { usePublicBookingSubmitActions } from "@/features/public-booking/hooks/use-public-booking-submit-actions";

function parseIsoDateToLocalDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return undefined;
  return new Date(y, mo - 1, d);
}

export function usePublicBookingPageState(referralCode: string) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const clinicQuery = usePublicBookingClinic(referralCode);
  const doctorsQuery = usePublicBookingDoctors(referralCode);

  const [doctorId, setDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(() => formatPickerIsoDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const slotsQuery = usePublicBookingSlots(
    referralCode,
    doctorId === ANY_DOCTOR_ID ? "any" : doctorId,
    slotDate,
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [selectedSlotDoctorId, setSelectedSlotDoctorId] = useState<string | null>(null);
  const [timeRangeStart, setTimeRangeStart] = useState<string>("");
  const [timeRangeEnd, setTimeRangeEnd] = useState<string>("");

  const [requiresOtp, setRequiresOtp] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [dpdpConsentAccepted, setDpdpConsentAccepted] = useState(false);

  const [submitFieldErrors, setSubmitFieldErrors] = useState<Record<string, string>>({});
  const [submitGeneralMessage, setSubmitGeneralMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mobileStep, setMobileStep] = useState<PublicBookingMobileStep>("visit");

  const unknownSubmitErrors = useMemo(
    () => Object.entries(submitFieldErrors).filter(([key]) => !PUBLIC_BOOKING_SUBMIT_FIELD_KEYS.has(key)),
    [submitFieldErrors],
  );

  const slotRangeSubmitError = useMemo(() => {
    const start = submitFieldErrors.requestedSlotStart;
    const end = submitFieldErrors.requestedSlotEnd;
    if (start && end && start !== end) return `${start} · ${end}`;
    return start ?? end ?? "";
  }, [submitFieldErrors.requestedSlotEnd, submitFieldErrors.requestedSlotStart]);

  const contextQuery = usePublicBookingContext(referralCode, verificationToken);

  const {
    phoneCheck,
    otpRequest,
    otpVerify,
    submit,
    runPhoneCheck,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
  } = usePublicBookingSubmitActions(referralCode, {
    phone,
    otp,
    turnstileToken,
    siteKey,
    requiresOtp,
    setRequiresOtp,
    verificationToken,
    setVerificationToken,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    dateOfBirth,
    dpdpConsentAccepted,
    reason,
    notes,
    slotDate,
    doctorId,
    selectedStart,
    selectedEnd,
    selectedSlotDoctorId,
    setSubmitFieldErrors,
    setSubmitGeneralMessage,
    setDone,
  });

  const visitCanContinue = useMemo(
    () => !siteKey || Boolean(turnstileToken),
    [siteKey, turnstileToken],
  );

  const contactCanContinue = useMemo(
    () =>
      Boolean(phone.trim()) &&
      requiresOtp !== null &&
      (requiresOtp !== true || Boolean(verificationToken)) &&
      (requiresOtp === true ||
        (Boolean(firstName.trim()) &&
          Boolean(lastName.trim()) &&
          Boolean(dateOfBirth.trim()) &&
          dpdpConsentAccepted)),
    [dateOfBirth, dpdpConsentAccepted, firstName, lastName, phone, requiresOtp, verificationToken],
  );

  const submitRequestReady = useMemo(() => {
    if (!slotDate?.trim()) return false;
    if (!visitCanContinue) return false;
    if (!phone.trim()) return false;
    if (requiresOtp === null) return false;
    if (requiresOtp === true) {
      if (!verificationToken) return false;
    } else {
      if (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) return false;
      if (!dpdpConsentAccepted) return false;
    }
    return true;
  }, [slotDate, visitCanContinue, phone, requiresOtp, verificationToken, firstName, lastName, dateOfBirth, dpdpConsentAccepted]);

  const goToStep = useCallback(
    (step: PublicBookingMobileStep, focusFieldId?: string) => {
      setMobileStep(step);
      if (focusFieldId) {
        window.setTimeout(() => {
          const el = document.getElementById(focusFieldId);
          el?.focus({ preventScroll: true });
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [],
  );

  const selectedCalendarDay = useMemo(() => parseIsoDateToLocalDate(slotDate), [slotDate]);

  useEffect(() => {
    const parsed = parseIsoDateToLocalDate(slotDate);
    if (parsed) setCalendarMonth(parsed);
  }, [slotDate]);

  useEffect(() => {
    setTimeRangeStart("");
    setTimeRangeEnd("");
  }, [slotDate, doctorId]);

  useEffect(() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
      setDpdpConsentAccepted(false);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dateOfBirth;
        return next;
      });
    }
  }, [requiresOtp]);

  const pageState = useMemo(() => {
    if (clinicQuery.isLoading) return "loading" as const;
    if (clinicQuery.isError) return "error" as const;
    return "success" as const;
  }, [clinicQuery.isLoading, clinicQuery.isError]);

  const handleSelectSlot = useCallback((startIso: string, endIso: string) => {
    setSelectedStart(startIso);
    setSelectedEnd(endIso);
    setSelectedSlotDoctorId(null);
    setSubmitFieldErrors((prev) => {
      const next = { ...prev };
      delete next.requestedSlotStart;
      delete next.requestedSlotEnd;
      return next;
    });
  }, []);

  const handleSelectSlotWithDoctor = useCallback(
    (startIso: string, endIso: string, slotDoctorId: string) => {
      setSelectedStart(startIso);
      setSelectedEnd(endIso);
      setSelectedSlotDoctorId(slotDoctorId);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.requestedSlotStart;
        delete next.requestedSlotEnd;
        return next;
      });
    },
    [],
  );

  const clearSlotSelection = useCallback(() => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setSelectedSlotDoctorId(null);
  }, []);

  const selectedDoctor = useMemo(
    () => (doctorsQuery.data?.doctors ?? []).find((d) => d.id === doctorId),
    [doctorId, doctorsQuery.data?.doctors],
  );
  const selectedDoctorName =
    doctorId === ANY_DOCTOR_ID ? "Any available doctor" : selectedDoctor?.name ?? null;

  const clinic = clinicQuery.data;
  const allSlots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const availableSlots = useMemo(() => allSlots.filter((s) => s.isAvailable), [allSlots]);

  const timeRangeOptions = useMemo(() => {
    const uniq = (values: string[]) => Array.from(new Set(values)).filter(Boolean);
    const sortIso = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
    return {
      starts: uniq(allSlots.map((s) => s.startTime)).sort(sortIso),
      ends: uniq(allSlots.map((s) => s.endTime)).sort(sortIso),
    };
  }, [allSlots]);

  const filteredAvailableSlots = useMemo(() => {
    if (!timeRangeStart && !timeRangeEnd) return availableSlots;
    const startMs = timeRangeStart ? new Date(timeRangeStart).getTime() : null;
    const endMs = timeRangeEnd ? new Date(timeRangeEnd).getTime() : null;
    return availableSlots.filter((s) => {
      const sStart = new Date(s.startTime).getTime();
      const sEnd = new Date(s.endTime).getTime();
      if (Number.isNaN(sStart) || Number.isNaN(sEnd)) return false;
      if (startMs !== null && sStart < startMs) return false;
      if (endMs !== null && sEnd > endMs) return false;
      return true;
    });
  }, [availableSlots, timeRangeEnd, timeRangeStart]);

  return {
    referralCode,
    siteKey,
    turnstileToken,
    setTurnstileToken,
    clinicQuery,
    doctorsQuery,
    slotsQuery,
    contextQuery,
    phoneCheck,
    otpRequest,
    otpVerify,
    submit,
    doctorId,
    setDoctorId,
    slotDate,
    setSlotDate,
    calendarMonth,
    setCalendarMonth,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    email,
    setEmail,
    dateOfBirth,
    setDateOfBirth,
    reason,
    setReason,
    notes,
    setNotes,
    selectedStart,
    selectedEnd,
    selectedSlotDoctorId,
    timeRangeStart,
    setTimeRangeStart,
    timeRangeEnd,
    setTimeRangeEnd,
    requiresOtp,
    setRequiresOtp,
    otp,
    setOtp,
    verificationToken,
    setVerificationToken,
    submitFieldErrors,
    setSubmitFieldErrors,
    submitGeneralMessage,
    done,
    setDone,
    unknownSubmitErrors,
    slotRangeSubmitError,
    selectedCalendarDay,
    pageState,
    handleSelectSlot,
    handleSelectSlotWithDoctor,
    clearSlotSelection,
    runPhoneCheck,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
    selectedDoctorName,
    clinic,
    allSlots,
    availableSlots,
    filteredAvailableSlots,
    timeRangeOptions,
    mobileStep,
    setMobileStep,
    goToStep,
    visitCanContinue,
    contactCanContinue,
    submitRequestReady,
    dpdpConsentAccepted,
    setDpdpConsentAccepted,
  };
}

export type PublicBookingPageController = ReturnType<
  typeof usePublicBookingPageState
>;
