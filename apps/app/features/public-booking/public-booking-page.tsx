"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { CategoryAvatar } from "@workspace/ui/components/category-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { FloatingInput } from "@workspace/ui/components/floating-input";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/right-rail-card";
import { Separator } from "@workspace/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  formatDate,
  formatPickerIsoDate,
  getFacilityLabel,
} from "@workspace/utils";
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
import { formatDateTime, formatTime } from "@/lib/formatters";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { TurnstileWidget } from "@/features/public-booking/components/turnstile-widget";
import { cn } from "@workspace/ui/lib/utils";
import type {
  PublicBookingClinicResponse,
  PublicBookingSlotListEmptyReason,
} from "@workspace/types";

const contactTileClass =
  "flex min-w-0 gap-3 rounded-[var(--radius-md)] border border-border/60 bg-surface-1 p-3.5 transition-colors duration-150 hover:border-border hover:bg-surface-2";

const bookingCardClass =
  "overflow-hidden border-border/70 bg-card shadow-sm ring-1 ring-border/25";

function publicBookingSlotEmptyMessage(
  reason: PublicBookingSlotListEmptyReason | undefined,
): string {
  switch (reason) {
    case "FULL_DAY_BLOCKED":
      return "This doctor is marked away for the full day you selected. Choose another date on the calendar.";
    case "DATE_PARSE_ERROR":
      return "That date could not be read correctly. Pick the day again on the calendar.";
    case "NO_SLOTS_IN_RANGE":
      return "Visit hours look incomplete for this day (no time slots could be built from the schedule). Please contact the clinic.";
    case "NO_WEEKLY_HOURS":
    default:
      return "There are no online visit hours on file for this doctor or for the clinic on this weekday (based on the clinic time zone). The care team can set default clinic hours during onboarding or under staff settings. Try another weekday, or contact the clinic to book.";
  }
}

function BookingSectionHeader({
  icon: Icon,
  micro,
  title,
  description,
  tone = "primary",
}: {
  icon: LucideIcon;
  micro: string;
  title: string;
  description: ReactNode;
  tone?: "info" | "success" | "warning" | "destructive" | "primary" | "neutral";
}) {
  return (
    <div className="flex gap-3.5 sm:gap-4">
      <CategoryAvatar
        icon={<Icon strokeWidth={1.5} />}
        tone={tone}
        size="lg"
        className="mt-0.5"
      />
      <div className="min-w-0 space-y-1.5">
        <MicroLabel as="h3">{micro}</MicroLabel>
        <CardTitle className="text-[length:var(--fs-xl)] font-semibold tracking-tight sm:text-[length:var(--fs-2xl)]">
          {title}
        </CardTitle>
        <CardDescription className="max-w-prose text-pretty text-[length:var(--fs-sm)] sm:text-[length:var(--fs-base)]">
          {description}
        </CardDescription>
      </div>
    </div>
  );
}

const bookingSteps = [
  "Choose a doctor and time",
  "Share your contact details",
  "Send the request for confirmation",
] as const;

function PublicBookingHero({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-[linear-gradient(135deg,var(--card),var(--surface-tint))] px-5 py-6 shadow-sm ring-1 ring-border/25 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/30"
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
        <div className="max-w-2xl space-y-3">
          <div className="space-y-2">
            <h1 className="font-serif text-[length:var(--fs-4xl)] font-semibold leading-[1.02] tracking-normal text-foreground sm:text-[length:var(--fs-5xl)] lg:text-[length:var(--fs-6xl)]">
              {clinicName}
            </h1>
            <Badge
              variant="secondary"
              className="normal-case tracking-tight text-[length:var(--fs-xs)] font-medium"
            >
              {facilityLabel}
            </Badge>
          </div>
          <p className="max-w-xl text-pretty text-[length:var(--fs-lg)] leading-relaxed text-muted-foreground">
            Request a visit at this {facilityLabel.toLowerCase()} in a few
            minutes. Pick a time, leave your details, and the care team will
            confirm the appointment.
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border/65 bg-surface-1/90 p-4 shadow-sm ring-1 ring-inset ring-border/20 sm:p-5">
          <MicroLabel as="h2">Online booking</MicroLabel>
          <ol className="mt-4 space-y-2.5">
            {bookingSteps.map((step, index) => (
              <li
                key={step}
                className="flex gap-3 rounded-[var(--radius-md)] border border-border/50 bg-card/80 px-3 py-2.5 shadow-sm sm:gap-3.5 sm:px-3.5 sm:py-3"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[length:var(--fs-xs)] font-semibold text-primary-foreground shadow-sm sm:size-8"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 pt-0.5 text-[length:var(--fs-sm)] font-medium leading-snug text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function BookingFlowStepper({
  visitComplete,
  contactComplete,
}: {
  visitComplete: boolean;
  contactComplete: boolean;
}) {
  const currentIndex = !visitComplete ? 0 : !contactComplete ? 1 : 2;
  const steps = [
    { title: "Schedule", caption: "Doctor, date, and time" },
    { title: "Your details", caption: "Name and phone" },
    { title: "Submit", caption: "Review and send" },
  ] as const;

  return (
    <nav
      aria-label="Booking progress"
      className="rounded-[var(--radius-lg)] border border-border/60 bg-card px-3 py-4 shadow-sm ring-1 ring-border/25 sm:px-5 sm:py-5"
    >
      <MicroLabel className="mb-3 block sm:mb-4">Your progress</MicroLabel>
      <div className="rounded-[var(--radius-md)] bg-muted/35 p-3 ring-1 ring-inset ring-border/35 sm:p-4">
        <ol className="grid grid-cols-3 gap-1.5 sm:gap-4">
        {steps.map((step, i) => {
          const done =
            (i === 0 && visitComplete) || (i === 1 && contactComplete);
          const current = i === currentIndex;
          const muted = i > currentIndex;

          return (
            <li
              key={step.title}
              className="flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-[length:var(--fs-xs)] font-semibold sm:size-10 sm:text-[length:var(--fs-sm)]",
                  done &&
                    "border-primary bg-primary text-primary-foreground shadow-sm",
                  current &&
                    !done &&
                    "border-primary/70 bg-primary/[0.12] text-primary shadow-sm",
                  muted &&
                    "border-border/60 bg-muted/35 text-muted-foreground",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? (
                  <Check
                    className="size-[1.05rem] sm:size-[1.125rem]"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : (
                  <span aria-hidden>{i + 1}</span>
                )}
              </span>
              <div className="min-w-0 space-y-0.5 px-0.5">
                <p
                  className={cn(
                    "text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide sm:text-[length:var(--fs-xs)]",
                    muted && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    "hidden text-[length:var(--fs-2xs)] leading-snug text-muted-foreground sm:block",
                    muted && "opacity-80",
                  )}
                >
                  {step.caption}
                </p>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
    </nav>
  );
}

function ContactTile({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(contactTileClass, className)}>
      <CategoryAvatar
        icon={<Icon strokeWidth={1.5} />}
        tone="neutral"
        size="sm"
        className="mt-0.5 bg-background"
      />
      <div className="min-w-0">
        <MicroLabel as="p" className="mt-0">
          {label}
        </MicroLabel>
        <div className="mt-0.5 min-w-0 text-[length:var(--fs-sm)] font-medium text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function ClinicContactCard({
  clinic,
}: {
  clinic: PublicBookingClinicResponse;
}) {
  const websiteHref = clinic.website
    ? clinic.website.startsWith("http")
      ? clinic.website
      : `https://${clinic.website}`
    : null;

  return (
    <Card className={cn(bookingCardClass, "gap-0")}>
      <CardHeader className="border-b border-border/60 bg-surface-2 py-4">
        <div className="flex items-start gap-3">
          <CategoryAvatar
            icon={<MapPin strokeWidth={1.5} />}
            tone="primary"
            size="md"
          />
          <div className="min-w-0 space-y-1">
            <MicroLabel as="h2">Location</MicroLabel>
            <CardTitle className="text-[length:var(--fs-lg)]">
              Visit details
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        {clinic.address ? (
          <ContactTile icon={Building2} label="Address">
            {clinic.address}
          </ContactTile>
        ) : null}
        {clinic.phone ? (
          <ContactTile icon={Phone} label="Phone">
            <a
              className="break-words underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline"
              href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
            >
              {clinic.phone}
            </a>
          </ContactTile>
        ) : null}
        {clinic.email ? (
          <ContactTile icon={Mail} label="Email">
            <a
              className="break-words underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline"
              href={`mailto:${clinic.email}`}
            >
              {clinic.email}
            </a>
          </ContactTile>
        ) : null}
        {clinic.website && websiteHref ? (
          <ContactTile icon={Globe} label="Website">
            <a
              className="break-words underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline"
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {clinic.website}
            </a>
          </ContactTile>
        ) : null}
        <ContactTile icon={Clock} label="Local time zone">
          {clinic.timezone}
        </ContactTile>
      </CardContent>
    </Card>
  );
}

function RequestSummaryCard({
  selectedDoctorName,
  selectedCalendarDay,
  selectedStart,
  selectedEnd,
}: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
}) {
  const hasVisitSelection = Boolean(
    selectedDoctorName && selectedCalendarDay && selectedStart && selectedEnd,
  );

  return (
    <Card className={cn(bookingCardClass, "gap-0")}>
      <CardHeader className="border-b border-border/60 bg-surface-2 py-4">
        <div className="flex items-start gap-3">
          <CategoryAvatar
            icon={<CalendarIcon strokeWidth={1.5} />}
            tone={hasVisitSelection ? "success" : "neutral"}
            size="md"
          />
          <div className="min-w-0 space-y-1">
            <MicroLabel as="h2">Your request</MicroLabel>
            <CardTitle className="text-[length:var(--fs-lg)]">
              {hasVisitSelection ? "Ready to review" : "Build your visit"}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        <div
          className={cn(
            "rounded-[var(--radius-md)] border border-border/60 bg-surface-1 p-3.5 transition-colors duration-150",
            selectedDoctorName &&
              "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/10",
          )}
        >
          <MicroLabel as="p" className="mt-0">
            Doctor
          </MicroLabel>
          <p className="mt-1 text-[length:var(--fs-sm)] font-medium text-foreground">
            {selectedDoctorName ?? "Select a doctor"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-border/60 bg-surface-1 p-3.5 transition-colors duration-150",
              selectedCalendarDay &&
                "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/10",
            )}
          >
            <MicroLabel as="p" className="mt-0">
              Day
            </MicroLabel>
            <p className="mt-1 text-[length:var(--fs-sm)] font-medium text-foreground">
              {selectedCalendarDay
                ? formatDate(selectedCalendarDay, "EEE, d MMM")
                : "Choose day"}
            </p>
          </div>
          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-border/60 bg-surface-1 p-3.5 transition-colors duration-150",
              selectedStart &&
                selectedEnd &&
                "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/10",
            )}
          >
            <MicroLabel as="p" className="mt-0">
              Time
            </MicroLabel>
            <p className="mt-1 text-[length:var(--fs-sm)] font-medium text-foreground">
              {selectedStart && selectedEnd
                ? `${formatTime(selectedStart)} - ${formatTime(selectedEnd)}`
                : "Pick slot"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingActionPanel({
  onPhoneCheck,
  onSubmit,
  canCheckPhone,
  isPhoneCheckPending,
  isSubmitting,
  className,
}: {
  onPhoneCheck: () => void;
  onSubmit: () => void;
  canCheckPhone: boolean;
  isPhoneCheckPending: boolean;
  isSubmitting: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        bookingCardClass,
        "rounded-[var(--radius-lg)] border-border/70 bg-card p-4 shadow-lg sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex gap-3.5 rounded-[var(--radius-md)] border border-border/60 bg-surface-2 p-3.5 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
        <CategoryAvatar
          icon={<ShieldCheck strokeWidth={1.5} />}
          tone="primary"
          size="sm"
          className="mt-0.5 shrink-0"
        />
        <p className="min-w-0 text-pretty">
          Submitting sends a request only. The care team still confirms before it
          is a firm appointment.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-sm)]"
          onClick={onPhoneCheck}
          disabled={isPhoneCheckPending || !canCheckPhone}
        >
          Check phone number
        </Button>
        <Button
          type="button"
          className="h-12 w-full rounded-[var(--radius-md)] px-6 text-[length:var(--fs-base)] font-semibold shadow-sm"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          Submit visit request
        </Button>
      </div>
    </div>
  );
}

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

interface PublicBookingPageProps {
  referralCode: string;
}

export function PublicBookingPage({ referralCode }: PublicBookingPageProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const clinicQuery = usePublicBookingClinic(referralCode);
  const doctorsQuery = usePublicBookingDoctors(referralCode);

  const [doctorId, setDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(() => formatPickerIsoDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

  const selectedDoctor = useMemo(
    () => (doctorsQuery.data?.doctors ?? []).find((d) => d.id === doctorId),
    [doctorId, doctorsQuery.data?.doctors],
  );
  const selectedDoctorName = selectedDoctor?.name ?? null;

  if (done) {
    return (
      <AppPageScaffold
        className={cn(
          "app-shell-bg min-h-[100dvh] max-w-full",
          "px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
        )}
        contentClassName="pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        header={
          <PageHeader
            title="Your request was sent"
            titleAlign="center"
            className="mt-6 sm:mt-10"
            description="What happens next is up to how this location confirms visits."
          />
        }
      >
        <div className="mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/50 bg-card/95 px-5 py-9 text-center shadow-md ring-1 ring-border/30 sm:px-8 sm:py-11">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-success/[0.12] to-transparent"
            />
            <div className="relative space-y-5">
              <div
                className="mx-auto flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-gradient-to-br from-success/22 to-success/8 text-success ring-4 ring-success/10"
                aria-hidden
              >
                <CheckCircle2 className="h-11 w-11" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <MicroLabel as="h3">You are done here</MicroLabel>
                <p className="font-serif text-[length:var(--fs-3xl)] font-semibold tracking-tight text-foreground">
                  Thank you
                </p>
                <p className="mx-auto max-w-sm text-[length:var(--fs-base)] leading-relaxed text-muted-foreground">
                  The care team will reach out using the phone or WhatsApp channel
                  they use for confirmations.
                </p>
              </div>
              <p className="text-[length:var(--fs-sm)] text-muted-foreground">
                Save this tab if you want a bookmark, or close it anytime.
              </p>
            </div>
          </div>
        </div>
      </AppPageScaffold>
    );
  }

  const clinic = clinicQuery.data;
  const allSlots = slotsQuery.data?.slots ?? [];
  const availableSlots = allSlots.filter((s) => s.isAvailable);
  const facilityWord = clinic
    ? getFacilityLabel(clinic.facilityLabel ?? "CLINIC")
    : "Clinic";

  return (
    <AppPageScaffold
      className={cn(
        "app-shell-bg min-h-[100dvh] max-w-full",
        "px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
      )}
      contentClassName="pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-6"
      header={
        clinic ? undefined : (
          <PageHeader
            title={
              clinicQuery.isError
                ? "This link is unavailable"
                : "Request a visit online"
            }
            titleAlign="center"
            className="mt-8 sm:mt-10"
            description={
              clinicQuery.isError
                ? "The booking link may be wrong or inactive. Reach out to the clinic directly."
                : "Fetching this location..."
            }
          />
        )
      }
    >
      <DataState
        status={pageState}
        loadingMessage="Loading location…"
        errorMessage="This booking link is not valid or the location is unavailable."
        onRetry={() => void clinicQuery.refetch()}
        emptyIcon={CalendarIcon}
        emptyTitle="Unavailable"
        emptyDescription="Try again later or contact the location directly."
      >
        {clinic ? (
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
            <PublicBookingHero
              clinicName={clinic.name}
              facilityLabel={facilityWord}
            />

            <BookingFlowStepper
              visitComplete={Boolean(
                doctorId &&
                  selectedCalendarDay &&
                  selectedStart &&
                  selectedEnd,
              )}
              contactComplete={Boolean(
                firstName.trim() && lastName.trim() && phone.trim(),
              )}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
              <aside className="order-2 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-6">
                <RightRailCardStack ariaLabel="Location and visit summary">
                  <RightRailCard
                    category="Need help?"
                    headline="Prefer to book by phone?"
                    description={
                      clinic.phone
                        ? `The care team at ${clinic.name} can take your request at ${clinic.phone}.`
                        : `Use the contact details in the card below to reach ${clinic.name} directly.`
                    }
                    tone="info"
                    action={
                      clinic.phone ? (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
                            className="transition-colors duration-150"
                          >
                            Call now
                          </a>
                        </Button>
                      ) : undefined
                    }
                  />
                  <ClinicContactCard clinic={clinic} />
                  <RequestSummaryCard
                    selectedDoctorName={selectedDoctorName}
                    selectedCalendarDay={selectedCalendarDay}
                    selectedStart={selectedStart}
                    selectedEnd={selectedEnd}
                  />
                </RightRailCardStack>
                <BookingActionPanel
                  className="hidden lg:block"
                  onPhoneCheck={() => void runPhoneCheck().catch(() => undefined)}
                  onSubmit={() => void handleSubmit()}
                  canCheckPhone={phone.trim().length > 0}
                  isPhoneCheckPending={phoneCheck.isPending}
                  isSubmitting={submit.isPending}
                />
              </aside>

              <div className="order-1 flex min-w-0 flex-col gap-5 sm:gap-6 lg:order-1">
                {siteKey ? (
                  <Card className={cn(bookingCardClass, "gap-0")}>
                    <CardHeader className="border-b border-border/60 bg-surface-2 py-4 sm:py-5">
                      <BookingSectionHeader
                        icon={Lock}
                        micro="Before you continue"
                        title="Quick verification"
                        description="This protects the page from automated abuse. Your visit details stay private."
                        tone="neutral"
                      />
                    </CardHeader>
                    <CardContent className="bg-muted/[0.07] px-4 py-5 sm:px-6">
                      <TurnstileWidget
                        siteKey={siteKey}
                        onToken={(t) => setTurnstileToken(t)}
                        onExpire={() => setTurnstileToken(null)}
                        className="flex w-full justify-center [&_iframe]:max-w-full"
                      />
                    </CardContent>
                  </Card>
                ) : null}

                <Card className={cn(bookingCardClass, "gap-0")}>
                  <CardHeader className="border-b border-border/60 bg-surface-2 py-4 sm:py-5">
                    <BookingSectionHeader
                      icon={CalendarIcon}
                      micro="Appointment"
                      title="Doctor, date, and time"
                      description="Select who you would like to see, pick a day, then tap an open slot that works for you."
                    />
                  </CardHeader>
                  <CardContent className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                    <div className="space-y-2">
                      <MicroLabel as="p" className="mt-0">
                        Doctor
                      </MicroLabel>
                      <Select
                        value={doctorId}
                        onValueChange={(v) => {
                          setDoctorId(v);
                          setSelectedStart(null);
                          setSelectedEnd(null);
                        }}
                      >
                        <SelectTrigger
                          className="h-12 w-full rounded-[var(--radius-md)] border-border/70 bg-background text-[length:var(--fs-base)] shadow-sm"
                          aria-label="Doctor"
                          disabled={doctorsQuery.isLoading}
                        >
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(doctorsQuery.data?.doctors ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name ?? "Doctor"}
                              {d.specialization ? ` - ${d.specialization}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {doctorsQuery.isError ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void doctorsQuery.refetch()}
                        >
                          Retry loading doctors
                        </Button>
                      ) : null}
                    </div>

                    <Separator className="my-1 bg-border/70 sm:my-2" />

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.82fr)] xl:items-start">
                      <div className="space-y-3">
                        <MicroLabel as="p" className="mt-0">
                          Preferred day
                        </MicroLabel>
                        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-background p-2.5 ring-1 ring-inset ring-border/25 sm:p-3.5">
                          <Calendar
                            mode="single"
                            required
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            selected={selectedCalendarDay}
                            onSelect={(d) => {
                              if (d) {
                                setSlotDate(formatPickerIsoDate(d));
                                setSelectedStart(null);
                                setSelectedEnd(null);
                              }
                            }}
                            captionLayout="dropdown"
                            className="w-full max-w-full bg-transparent p-0 [--cell-size:2rem] sm:[--cell-size:2.125rem] [&_[data-day]]:!size-auto [&_[data-day]]:!min-h-0 [&_[data-day]]:!min-w-0 [&_[data-day]]:!h-full [&_[data-day]]:!w-full [&_table]:w-full [&_td]:p-1"
                            classNames={{ root: "w-full max-w-full" }}
                          />
                        </div>
                        <div className="rounded-[var(--radius-md)] border border-border/55 bg-surface-1 px-3 py-2.5 ring-1 ring-inset ring-border/20 sm:px-3.5 sm:py-3">
                          <p className="text-[length:var(--fs-sm)] leading-snug text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Selected
                            </span>
                            {": "}
                            {selectedCalendarDay
                              ? formatDate(
                                  selectedCalendarDay,
                                  "EEE, d MMM yyyy",
                                )
                              : "Tap a date on the calendar"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <MicroLabel as="p" className="mt-0">
                          Open times that day
                        </MicroLabel>
                        {!doctorId ? (
                          <div className="flex gap-3.5 rounded-[var(--radius-md)] border border-dashed border-border/70 bg-surface-2 p-4 sm:p-5">
                            <CategoryAvatar
                              icon={<UserCircle strokeWidth={1.5} />}
                              tone="primary"
                              size="sm"
                              className="mt-0.5 shrink-0"
                            />
                            <p className="min-w-0 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
                              Choose a doctor first to see open times here.
                            </p>
                          </div>
                        ) : slotsQuery.isLoading ? (
                          <div className="rounded-[var(--radius-md)] border border-dashed border-border/60 bg-surface-1 px-4 py-8 sm:px-6 sm:py-10">
                            <LoadingState message="Loading open times…" />
                          </div>
                        ) : slotsQuery.isError ? (
                          <div className="flex flex-col items-stretch gap-3 rounded-[var(--radius-md)] border border-dashed border-border/70 bg-surface-2 p-4 sm:p-5">
                            <p className="text-[length:var(--fs-sm)] text-muted-foreground">
                              Open times could not be loaded.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => void slotsQuery.refetch()}
                            >
                              Retry loading times
                            </Button>
                          </div>
                        ) : allSlots.length === 0 ? (
                          <div className="flex gap-3.5 rounded-[var(--radius-md)] border border-dashed border-border/70 bg-surface-2 p-4 sm:p-5">
                            <CategoryAvatar
                              icon={<CalendarIcon strokeWidth={1.5} />}
                              tone="neutral"
                              size="sm"
                              className="mt-0.5 shrink-0"
                            />
                            <p className="min-w-0 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
                              {publicBookingSlotEmptyMessage(
                                slotsQuery.data?.slotListEmptyReason,
                              )}
                            </p>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="space-y-3">
                            <div className="flex gap-3.5 rounded-[var(--radius-md)] border border-dashed border-border/70 bg-surface-2 p-4 sm:p-5">
                              <CategoryAvatar
                                icon={<Clock strokeWidth={1.5} />}
                                tone="warning"
                                size="sm"
                                className="mt-0.5 shrink-0"
                              />
                              <p className="min-w-0 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
                                There are no free times left on this date. The
                                times below are already booked, blocked, or
                                earlier in the day. Choose another date if you
                                need an opening.
                              </p>
                            </div>
                            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                              {allSlots.map((s) => (
                                <li
                                  key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                    className="h-auto min-h-[3.25rem] w-full cursor-not-allowed justify-start rounded-[var(--radius-md)] border-border/50 bg-muted/30 px-4 py-3 text-left opacity-80 shadow-none"
                                    aria-label={`${formatTime(s.startTime)} to ${formatTime(s.endTime)}, unavailable`}
                                  >
                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                      <span className="text-[length:var(--fs-sm)] font-semibold tracking-tight text-muted-foreground">
                                        {formatTime(s.startTime)}{" "}
                                        <span
                                          aria-hidden
                                          className="font-normal text-muted-foreground/80"
                                        >
                                          -
                                        </span>{" "}
                                        {formatTime(s.endTime)}
                                      </span>
                                      <span className="text-[length:var(--fs-xs)] text-muted-foreground">
                                        Unavailable
                                        {s.doctorName
                                          ? ` — ${s.doctorName}`
                                          : ""}
                                      </span>
                                    </span>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="rounded-[var(--radius-md)] border border-border/50 bg-muted/[0.06] p-2.5 ring-1 ring-inset ring-border/15 sm:p-3.5">
                            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                            {availableSlots.map((s) => {
                              const selected = selectedStart === s.startTime;
                              return (
                                <li
                                  key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                                >
                                  <Button
                                    type="button"
                                    variant={selected ? "default" : "outline"}
                                    className={cn(
                                      "h-auto min-h-[3.25rem] w-full justify-start rounded-[var(--radius-md)] px-4 py-3 text-left shadow-sm outline-none ring-offset-background transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                                      selected
                                        ? "ring-2 ring-primary/45 ring-offset-[3px]"
                                        : "touch-manipulation border-border/65 bg-background hover:border-primary/30 hover:bg-surface-2",
                                    )}
                                    onClick={() =>
                                      handleSelectSlot(s.startTime, s.endTime)
                                    }
                                  >
                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                      <span className="text-[length:var(--fs-sm)] font-semibold tracking-tight">
                                        {formatTime(s.startTime)}{" "}
                                        <span
                                          aria-hidden
                                          className="font-normal text-muted-foreground/90"
                                        >
                                          -
                                        </span>{" "}
                                        {formatTime(s.endTime)}
                                      </span>
                                      {s.doctorName ? (
                                        <span className="text-[length:var(--fs-xs)] text-muted-foreground">
                                          {s.doctorName}
                                          {s.specialization
                                            ? ` - ${s.specialization}`
                                            : ""}
                                        </span>
                                      ) : null}
                                    </span>
                                    {selected ? (
                                      <CheckCircle2
                                        className="ml-3 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-foreground"
                                        aria-hidden
                                      />
                                    ) : null}
                                  </Button>
                                </li>
                              );
                            })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(bookingCardClass, "gap-0")}>
                  <CardHeader className="border-b border-border/60 bg-surface-2 py-4 sm:py-5">
                    <BookingSectionHeader
                      icon={UserCircle}
                      micro="How we reach you"
                      title="Your contact details"
                      description={
                        <>
                          Please use the same phone this{" "}
                          {facilityWord.toLowerCase()} has on file when
                          possible, so we can match your request to your chart.
                        </>
                      }
                      tone="info"
                    />
                  </CardHeader>
                  <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-3.5 sm:px-6 sm:py-6">
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
                    <Separator className="sm:col-span-2 sm:my-0.5" />
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
                      containerClassName="sm:col-span-2"
                    />
                    <div className="grid gap-1.5 sm:col-span-2">
                      <MicroLabel as="span" id="pb-notes-label" className="mt-0">
                        Notes for the team
                      </MicroLabel>
                      <Textarea
                        id="pb-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter notes for the team"
                        maxLength={1000}
                        aria-labelledby="pb-notes-label"
                        className="min-h-[96px] rounded-[var(--radius-md)] border-border/80 bg-background shadow-sm"
                      />
                    </div>
                  </CardContent>
                </Card>

            {requiresOtp === false ? (
              <Card
                className={cn(
                  bookingCardClass,
                  "border-muted-foreground/30 bg-muted/[0.55]",
                )}
              >
                <CardHeader className="space-y-2 py-6 sm:space-y-2.5 sm:py-7">
                  <MicroLabel as="h3">New to booking here online</MicroLabel>
                  <CardTitle className="font-serif text-[length:var(--fs-xl)] sm:text-[length:var(--fs-2xl)]">
                    You are welcome
                  </CardTitle>
                  <CardDescription className="max-w-prose text-pretty text-[length:var(--fs-sm)] leading-relaxed sm:text-[length:var(--fs-base)]">
                    We did not find an existing chart for this phone number at this
                    location yet. Submit your request and staff will confirm your
                    visit.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {requiresOtp ? (
              <Card
                className={cn(
                  bookingCardClass,
                  "border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent ring-primary/20",
                )}
              >
                <CardHeader className="space-y-2 border-b border-primary/15 pb-4 sm:space-y-2.5 sm:pb-5">
                  <MicroLabel as="h3">We recognize this number</MicroLabel>
                  <CardTitle className="font-serif text-[length:var(--fs-xl)] sm:text-[length:var(--fs-2xl)]">
                    Verify your phone for security
                  </CardTitle>
                  <CardDescription className="max-w-prose text-pretty text-[length:var(--fs-sm)] leading-relaxed sm:text-[length:var(--fs-base)]">
                    This phone matches records at this location. Request a one-time
                    code via WhatsApp, then enter it so we can show your recent
                    visits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 px-4 pb-6 pt-0 sm:gap-5 sm:px-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-[var(--radius-md)] border-primary/35 bg-background/95 py-6 text-[length:var(--fs-base)] shadow-sm transition-colors duration-150 hover:border-primary/50 hover:bg-background sm:h-11 sm:w-auto sm:min-h-0 sm:py-2"
                    onClick={() => void handleRequestOtp()}
                    disabled={otpRequest.isPending}
                  >
                    Send code to WhatsApp
                  </Button>
                  <FloatingInput
                    id="pb-otp"
                    label="Verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    className="h-12 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold sm:h-11 sm:w-auto sm:min-w-[12rem]"
                    onClick={() => void handleVerifyOtp()}
                    disabled={otpVerify.isPending || otp.length < 4}
                  >
                    Verify and continue
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {verificationToken ? (
              <Card className={cn(bookingCardClass, "transition-colors duration-150")}>
                <CardHeader className="border-b border-border/50 bg-muted/[0.38] pb-4 pt-5 sm:pb-6 sm:pt-6">
                  <BookingSectionHeader
                    icon={Sparkles}
                    micro="Your history here"
                    title="Recent visits at this location"
                    description={
                      <>
                        A short summary from your chart at {clinic.name} so you
                        can book with context.
                      </>
                    }
                  />
                </CardHeader>
                <CardContent className="bg-muted/[0.06] px-4 pt-5 sm:px-6 sm:pt-6">
                  <DataState
                    status={
                      contextQuery.isLoading
                        ? "loading"
                        : contextQuery.isError
                          ? "error"
                          : "success"
                    }
                    loadingMessage="Loading your visit summary…"
                    errorMessage="We could not load your visit summary."
                    onRetry={() => void contextQuery.refetch()}
                  >
                    {contextQuery.data ? (
                      <div className="space-y-4">
                        {contextQuery.data.patientSince ? (
                          <div className="flex gap-3 rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 text-sm shadow-sm">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground"
                              aria-hidden
                            >
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Patient since
                              </p>
                              <p className="mt-0.5 font-medium text-foreground">
                                {formatDate(
                                  new Date(contextQuery.data.patientSince),
                                  "d MMMM yyyy",
                                )}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        {contextQuery.data.appointments.length === 0 ? (
                          <p className="rounded-[var(--radius-md)] border border-dashed border-border/80 bg-background/80 px-4 py-4 text-center text-sm text-muted-foreground">
                            No prior visits on file for online booking — you are
                            all set to request a new time.
                          </p>
                        ) : (
                          <ul className="space-y-2.5">
                            {contextQuery.data.appointments.map((a) => (
                              <li
                                key={a.id}
                                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border/70 bg-card px-3.5 py-3.5 shadow-sm transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {a.doctorName ?? "Doctor"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDateTime(a.startTime)}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="w-fit shrink-0">
                                  {formatAppointmentStatus(a.status)}
                                </Badge>
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

                <BookingActionPanel
                  className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 lg:hidden"
                  onPhoneCheck={() => void runPhoneCheck().catch(() => undefined)}
                  onSubmit={() => void handleSubmit()}
                  canCheckPhone={phone.trim().length > 0}
                  isPhoneCheckPending={phoneCheck.isPending}
                  isSubmitting={submit.isPending}
                />
              </div>
            </div>
          </div>
        ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
