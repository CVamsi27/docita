"use client";

import { useCallback, useMemo, useState } from "react";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { FloatingInput } from "@workspace/ui/components/floating-input";
import { Input } from "@workspace/ui/components/input";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Textarea } from "@workspace/ui/components/textarea";
import { Calendar } from "lucide-react";
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
import { formatDateTime } from "@/lib/formatters";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { TurnstileWidget } from "@/features/public-booking/components/turnstile-widget";

function formatAppointmentStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "Scheduled",
    CONFIRMED: "Confirmed",
    RESCHEDULING: "Rescheduling",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No show",
  };
  return map[status] ?? status;
}

interface PublicBookingPageProps {
  referralCode: string;
}

export function PublicBookingPage({ referralCode }: PublicBookingPageProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const clinicQuery = usePublicBookingClinic(referralCode);
  const doctorsQuery = usePublicBookingDoctors(referralCode);

  const [doctorId, setDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const slotsQuery = usePublicBookingSlots(referralCode, doctorId, slotDate);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);

  const [requiresOtp, setRequiresOtp] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );

  const contextQuery = usePublicBookingContext(
    referralCode,
    verificationToken,
  );

  const phoneCheck = usePublicBookingPhoneCheck(referralCode);
  const otpRequest = usePublicBookingOtpRequest(referralCode);
  const otpVerify = usePublicBookingOtpVerify(referralCode);
  const submit = usePublicBookingSubmit(referralCode);

  const [done, setDone] = useState(false);

  const pageState = useMemo(() => {
    if (clinicQuery.isLoading) return "loading" as const;
    if (clinicQuery.isError) return "error" as const;
    return "success" as const;
  }, [clinicQuery.isLoading, clinicQuery.isError]);

  const handleSelectSlot = useCallback((startIso: string, endIso: string) => {
    setSelectedStart(startIso);
    setSelectedEnd(endIso);
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
        "form",
      );
      throw error;
    }
  }, [phone, phoneCheck, turnstileToken]);

  const handleRequestOtp = async () => {
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
        "form",
      );
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await otpVerify.mutateAsync({ phoneNumber: phone, otp });
      setVerificationToken(res.bookingVerificationToken);
      setFirstName(res.patient.firstName);
      setLastName(res.patient.lastName);
      if (res.patient.email) {
        setEmail(res.patient.email);
      }
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "That code did not work. Please try again.",
        "form",
      );
    }
  };

  const handleSubmit = async () => {
    if (!doctorId || !slotDate || !selectedStart || !selectedEnd) {
      showUserFacingErrorToast(
        null,
        "Choose a doctor, date, and available time slot.",
        "form",
      );
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      showUserFacingErrorToast(
        null,
        "Enter your first name, last name, and phone number.",
        "form",
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
          "form",
        );
        return;
      }

      await submit.mutateAsync({
        body: {
          phoneNumber: phone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          preferredDoctorId: doctorId,
          slotCalendarDate: slotDate,
          requestedSlotStart: selectedStart,
          requestedSlotEnd: selectedEnd,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined,
          bookingVerificationToken: verificationToken ?? undefined,
        },
        authorization: verificationToken ?? undefined,
      });
      setDone(true);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not submit your request. Please try again.",
        "form",
      );
    }
  };

  if (done) {
    return (
      <AppPageScaffold
        header={
          <PageHeader
            title="Request received"
            description="The clinic will confirm your appointment. You may close this page."
          />
        }
      >
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Thank you. If you have WhatsApp notifications enabled with this
              clinic, you will receive updates when your visit is confirmed.
            </p>
          </CardContent>
        </Card>
      </AppPageScaffold>
    );
  }

  const clinic = clinicQuery.data;
  const availableSlots =
    (slotsQuery.data?.slots ?? []).filter((s) => s.isAvailable) ?? [];

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={clinic ? `Book at ${clinic.name}` : "Book an appointment"}
          description="Choose a doctor and time, then send your request."
        />
      }
    >
      <DataState
        status={pageState}
        loadingMessage="Loading clinic…"
        errorMessage="This booking link is not valid or the clinic is unavailable."
        onRetry={() => void clinicQuery.refetch()}
        emptyIcon={Calendar}
        emptyTitle="Unavailable"
        emptyDescription="Try again later or contact the clinic directly."
      >
        {clinic ? (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <TurnstileWidget
              siteKey={siteKey}
              onToken={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken(null)}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Doctor and time</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
                    Doctor
                  </span>
                  <select
                    className="flex h-11 w-full rounded-xl border border-input bg-background/70 px-4 text-sm shadow-sm transition-colors duration-150 hover:bg-background/85 hover:border-border/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                    value={doctorId}
                    onChange={(e) => {
                      setDoctorId(e.target.value);
                      setSelectedStart(null);
                      setSelectedEnd(null);
                    }}
                    aria-label="Doctor"
                  >
                    <option value="">Select a doctor</option>
                    {(doctorsQuery.data?.doctors ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name ?? "Doctor"}
                        {d.specialization ? ` — ${d.specialization}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </span>
                  <Input
                    type="date"
                    value={slotDate}
                    onChange={(e) => {
                      setSlotDate(e.target.value);
                      setSelectedStart(null);
                      setSelectedEnd(null);
                    }}
                    aria-label="Preferred date"
                  />
                </label>
                {!doctorId || !slotDate ? (
                  <p className="text-sm text-muted-foreground">
                    Pick a doctor and date to see available times.
                  </p>
                ) : slotsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading available times…
                  </p>
                ) : slotsQuery.isError ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void slotsQuery.refetch()}
                  >
                    Retry loading times
                  </Button>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No open slots that day. Try another date.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availableSlots.map((s) => (
                      <Button
                        key={`${s.startTime}-${s.endTime}`}
                        type="button"
                        variant={
                          selectedStart === s.startTime ? "default" : "outline"
                        }
                        className="h-auto justify-start py-2 text-left touch-manipulation"
                        onClick={() =>
                          handleSelectSlot(s.startTime, s.endTime)
                        }
                      >
                        <span className="text-sm font-medium">
                          {formatDateTime(s.startTime)} –{" "}
                          {formatDateTime(s.endTime)}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <FloatingInput
                  id="pb-first-name"
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <FloatingInput
                  id="pb-last-name"
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
                <FloatingInput
                  id="pb-phone"
                  label="Phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setRequiresOtp(null);
                    setVerificationToken(null);
                  }}
                  autoComplete="tel"
                />
                <FloatingInput
                  id="pb-email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <FloatingInput
                  id="pb-reason"
                  label="Reason for visit"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="grid gap-1.5">
                  <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </span>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                    maxLength={1000}
                    aria-label="Notes"
                    className="min-h-[88px] rounded-xl border border-input bg-background/70 px-4 py-2 text-sm shadow-sm transition-colors duration-150"
                  />
                </div>
              </CardContent>
            </Card>

            {requiresOtp === false ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Online booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    New to online booking with us — we will confirm your visit
                    shortly after you submit your request.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {requiresOtp ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verify your phone</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm text-muted-foreground">
                    We found an existing record for this number at this clinic.
                    Request a code on WhatsApp, then enter it below.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleRequestOtp()}
                      disabled={otpRequest.isPending}
                    >
                      Send code
                    </Button>
                  </div>
                  <FloatingInput
                    id="pb-otp"
                    label="Verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    disabled={otpVerify.isPending || otp.length < 4}
                  >
                    Verify code
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {verificationToken ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your visits here</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataState
                    status={
                      contextQuery.isLoading
                        ? "loading"
                        : contextQuery.isError
                          ? "error"
                          : "success"
                    }
                    loadingMessage="Loading your visits…"
                    errorMessage="We could not load your visit history."
                    onRetry={() => void contextQuery.refetch()}
                  >
                    {contextQuery.data ? (
                      <div className="space-y-3">
                        {contextQuery.data.appointments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            First time booking online with us — welcome.
                          </p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {contextQuery.data.appointments.map((a) => (
                              <li
                                key={a.id}
                                className="rounded-md border border-border px-3 py-2"
                              >
                                <div className="font-medium">
                                  {a.doctorName ?? "Doctor"}
                                </div>
                                <div className="text-muted-foreground">
                                  {formatDateTime(a.startTime)} —{" "}
                                  {formatAppointmentStatus(a.status)}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </DataState>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => void runPhoneCheck().catch(() => undefined)}
                disabled={phoneCheck.isPending || !phone.trim()}
              >
                Check phone
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submit.isPending}
              >
                Request appointment
              </Button>
            </div>
          </div>
        ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
