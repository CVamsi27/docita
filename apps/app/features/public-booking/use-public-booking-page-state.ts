"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPickerIsoDate } from "@workspace/utils";
import {
  usePublicBookingClinic,
  usePublicBookingContext,
  usePublicBookingDoctors,
  usePublicBookingOtpRequest,
  usePublicBookingOtpVerify,
  usePublicBookingPhoneCheck,
  usePublicBookingSlots,
  usePublicBookingSubmit,
} from "@/hooks/api/use-public-booking";
import { ApiError } from "@/lib/errors";
import { buildPublicBookingSubmitErrors } from "@/lib/utils/api-validation-errors";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  ANY_DOCTOR_ID,
  type PublicBookingMobileStep,
  PUBLIC_BOOKING_SUBMIT_FIELD_KEYS,
} from "@/features/public-booking/public-booking-constants";

function parseIsoDateToLocalDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return undefined;
  }
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
  const [selectedSlotDoctorId, setSelectedSlotDoctorId] = useState<string | null>(
    null,
  );
  const [timeRangeStart, setTimeRangeStart] = useState<string>("");
  const [timeRangeEnd, setTimeRangeEnd] = useState<string>("");

  const [requiresOtp, setRequiresOtp] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );

  const [submitFieldErrors, setSubmitFieldErrors] = useState<
    Record<string, string>
  >({});
  const [submitGeneralMessage, setSubmitGeneralMessage] = useState<string | null>(
    null,
  );

  const unknownSubmitErrors = useMemo(() => {
    return Object.entries(submitFieldErrors).filter(
      ([key]) => !PUBLIC_BOOKING_SUBMIT_FIELD_KEYS.has(key),
    );
  }, [submitFieldErrors]);

  const slotRangeSubmitError = useMemo(() => {
    const start = submitFieldErrors.requestedSlotStart;
    const end = submitFieldErrors.requestedSlotEnd;
    if (start && end && start !== end) {
      return `${start} · ${end}`;
    }
    return start ?? end ?? "";
  }, [submitFieldErrors.requestedSlotEnd, submitFieldErrors.requestedSlotStart]);

  const contextQuery = usePublicBookingContext(
    referralCode,
    verificationToken,
  );

  const phoneCheck = usePublicBookingPhoneCheck(referralCode);
  const otpRequest = usePublicBookingOtpRequest(referralCode);
  const otpVerify = usePublicBookingOtpVerify(referralCode);
  const submit = usePublicBookingSubmit(referralCode);

  const [done, setDone] = useState(false);

  const [mobileStep, setMobileStep] =
    useState<PublicBookingMobileStep>("visit");

  const visitCanContinue = useMemo(
    () => !siteKey || Boolean(turnstileToken),
    [siteKey, turnstileToken],
  );

  const contactCanContinue = useMemo(
    () =>
      Boolean(firstName.trim()) &&
      Boolean(lastName.trim()) &&
      Boolean(phone.trim()) &&
      (requiresOtp !== true || Boolean(verificationToken)),
    [firstName, lastName, phone, requiresOtp, verificationToken],
  );

  /** Desktop + review submit: mirrors `handleSubmit` guards so the CTA stays disabled until ready. */
  const submitRequestReady = useMemo(() => {
    if (!slotDate?.trim()) return false;
    if (!visitCanContinue) return false;
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return false;
    if (requiresOtp === true && !verificationToken) return false;
    if (requiresOtp === false && !dateOfBirth.trim()) return false;
    return true;
  }, [
    slotDate,
    visitCanContinue,
    firstName,
    lastName,
    phone,
    requiresOtp,
    verificationToken,
    dateOfBirth,
  ]);

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

  const selectedCalendarDay = useMemo(
    () => parseIsoDateToLocalDate(slotDate),
    [slotDate],
  );

  useEffect(() => {
    const parsed = parseIsoDateToLocalDate(slotDate);
    if (parsed) {
      setCalendarMonth(parsed);
    }
  }, [slotDate]);

  useEffect(() => {
    setTimeRangeStart("");
    setTimeRangeEnd("");
  }, [slotDate, doctorId]);

  useEffect(() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
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

  const runPhoneCheck = useCallback(async () => {
    try {
      const res = await phoneCheck.mutateAsync({
        phoneNumber: phone,
        turnstileToken: turnstileToken ?? undefined,
      });
      setRequiresOtp(res.requiresOtp);
      return res;
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not verify this phone number. Please try again.",
        "generic",
      );
      throw error;
    }
  }, [phone, phoneCheck, turnstileToken]);

  const handleRequestOtp = useCallback(async () => {
    try {
      await runPhoneCheck();
      await otpRequest.mutateAsync({
        phoneNumber: phone,
        turnstileToken: turnstileToken ?? undefined,
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not send a verification code. Please try again.",
        "generic",
      );
    }
  }, [otpRequest, phone, runPhoneCheck, turnstileToken]);

  const handleVerifyOtp = useCallback(async () => {
    try {
      const res = await otpVerify.mutateAsync({ phoneNumber: phone, otp });
      setVerificationToken(res.bookingVerificationToken);
      setFirstName(res.patient.firstName);
      setLastName(res.patient.lastName);
      if (res.patient.email) {
        setEmail(res.patient.email);
      }
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.bookingVerificationToken;
        return next;
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "That code did not work. Please try again.",
        "generic",
      );
    }
  }, [otp, otpVerify, phone]);

  const handleSubmit = useCallback(async () => {
    setSubmitFieldErrors({});
    setSubmitGeneralMessage(null);

    if (!slotDate) {
      showUserFacingErrorToast(
        null,
        "Choose a date for your appointment request.",
        "generic",
      );
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      showUserFacingErrorToast(
        null,
        "Enter your first name, last name, and phone number.",
        "generic",
      );
      return;
    }

    try {
      let otpRequired = requiresOtp;
      if (otpRequired === null) {
        const check = await runPhoneCheck();
        otpRequired = check.requiresOtp;
      }
      if (otpRequired && !verificationToken) {
        showUserFacingErrorToast(
          null,
          "Verify your phone with the code we sent before submitting.",
          "generic",
        );
        return;
      }

      if (!otpRequired && !dateOfBirth.trim()) {
        showUserFacingErrorToast(
          null,
          "Enter your date of birth before submitting.",
          "generic",
        );
        return;
      }

      const resolvedDoctorId =
        doctorId === ANY_DOCTOR_ID ? selectedSlotDoctorId : doctorId || null;
      const includeSlot = Boolean(selectedStart && selectedEnd);

      await submit.mutateAsync({
        body: {
          phoneNumber: phone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: otpRequired ? undefined : dateOfBirth.trim() || undefined,
          email: email.trim() || undefined,
          preferredDoctorId: resolvedDoctorId ?? undefined,
          slotCalendarDate: slotDate,
          requestedSlotStart: includeSlot ? selectedStart ?? undefined : undefined,
          requestedSlotEnd: includeSlot ? selectedEnd ?? undefined : undefined,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined,
          bookingVerificationToken: verificationToken ?? undefined,
        },
        authorization: verificationToken ?? undefined,
      });
      setDone(true);
    } catch (error) {
      const built = buildPublicBookingSubmitErrors(error);
      let fieldErrors = built.fieldErrors;
      let generalMessage = built.generalMessage;

      if (fieldErrors.turnstileToken && !siteKey) {
        generalMessage = generalMessage ?? fieldErrors.turnstileToken;
        const next = { ...fieldErrors };
        delete next.turnstileToken;
        fieldErrors = next;
      }

      setSubmitFieldErrors(fieldErrors);
      setSubmitGeneralMessage(generalMessage);

      const hasFieldHints = Object.keys(fieldErrors).length > 0;
      if (hasFieldHints) {
        showUserFacingErrorToast(
          null,
          "Review the fields marked below and try again.",
          "form",
        );
      } else if (generalMessage) {
        // `submitGeneralMessage` Alert provides copy; skip extra toast noise.
      } else if (error instanceof ApiError) {
        showUserFacingErrorToast(
          null,
          "We could not submit your request. Please review your details and try again.",
          "form",
        );
      } else {
        showUserFacingErrorToast(
          error,
          "We could not submit your request. Please try again.",
          "generic",
        );
      }
    }
  }, [
    doctorId,
    firstName,
    lastName,
    phone,
    email,
    dateOfBirth,
    reason,
    notes,
    requiresOtp,
    runPhoneCheck,
    selectedEnd,
    selectedSlotDoctorId,
    selectedStart,
    siteKey,
    slotDate,
    submit,
    turnstileToken,
    verificationToken,
  ]);

  const selectedDoctor = useMemo(
    () => (doctorsQuery.data?.doctors ?? []).find((d) => d.id === doctorId),
    [doctorId, doctorsQuery.data?.doctors],
  );
  const selectedDoctorName =
    doctorId === ANY_DOCTOR_ID ? "Any available doctor" : selectedDoctor?.name ?? null;

  const clinic = clinicQuery.data;
  const allSlots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const availableSlots = useMemo(
    () => allSlots.filter((s) => s.isAvailable),
    [allSlots],
  );
  const timeRangeOptions = useMemo(() => {
    const uniq = (values: string[]) => Array.from(new Set(values)).filter(Boolean);
    const sortIso = (a: string, b: string) =>
      new Date(a).getTime() - new Date(b).getTime();

    const starts = uniq(allSlots.map((s) => s.startTime)).sort(sortIso);
    const ends = uniq(allSlots.map((s) => s.endTime)).sort(sortIso);

    return { starts, ends };
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
  };
}

export type PublicBookingPageController = ReturnType<
  typeof usePublicBookingPageState
>;
