"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar as CalendarIcon,
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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
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
import { DescriptionList } from "@workspace/ui/components/description-list";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/right-rail-card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Timeline, type TimelineItem } from "@workspace/ui/components/timeline";
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
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { cn } from "@workspace/ui/lib/utils";
import type {
  PublicBookingClinicResponse,
  PublicBookingSlotListEmptyReason,
} from "@workspace/types";

/** Matches consultation-style tiles (e.g. PatientContextCardUI): border + shadow for depth. */
const contactTileClass =
  "flex min-w-0 gap-3 rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm transition-colors duration-150 hover:bg-muted/30";

/** Overrides default Card vertical gap/padding for dense booking sections; keeps `ui-card-surface` from Card. */
const bookingCardClass = "gap-0 overflow-hidden py-0 sm:gap-0 sm:py-0";

function BookingTextField({
  id,
  label,
  placeholder,
  className,
  containerClassName,
  ...props
}: Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  placeholder?: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn("grid gap-2", containerClassName)}>
      <Label
        htmlFor={id}
        className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        className={cn(
          "h-11 rounded-[var(--radius-md)] px-3 text-[length:var(--fs-sm)] sm:text-[length:var(--fs-sm)]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function PublicBookingThemeToggle() {
  return (
    <div
      className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50"
      role="presentation"
    >
      <div className="pointer-events-auto rounded-[var(--radius-md)] border border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
        <ThemeToggleWithAppearanceSync />
      </div>
    </div>
  );
}

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
      return "No visit hours are set for this weekday for this doctor or clinic (using the clinic time zone). Try another day, or contact the clinic. Clinic staff can configure facility weekly hours in Docita (onboarding or facility settings) if online booking should be available.";
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
  "Choose a preferred day (optionally doctor/time)",
  "Share your contact details",
  "Send the request for confirmation",
] as const;

function appointmentTimelineAccent(status: string): NonNullable<
  TimelineItem["accent"]
> {
  switch (status) {
    case "COMPLETED":
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
    case "NO_SHOW":
      return "danger";
    case "SCHEDULED":
    case "RESCHEDULING":
    case "IN_PROGRESS":
      return "warning";
    default:
      return "default";
  }
}

function PublicBookingPoweredByFooter({
  className,
}: {
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 border-t border-border/40 pt-6 sm:flex-row sm:gap-4",
        className,
      )}
    >
      <p className="max-w-md text-center text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
        Secure scheduling — your details are protected in transit.
      </p>
      <a
        href="https://docita.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-transparent px-2 py-1 transition-colors duration-150 hover:border-border/60 hover:bg-surface-1"
      >
        <MicroLabel className="mt-0">Powered by</MicroLabel>
        <DocitaLogo showText={false} className="h-7 w-7" iconClassName="h-7 w-7" />
      </a>
    </footer>
  );
}

function SlotTimesSkeletonGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-[var(--radius-md)] border border-border/70 bg-card p-3 shadow-sm sm:p-4 xl:min-h-0 xl:flex-1",
        className,
      )}
    >
      <MicroLabel as="p" className="mb-3 mt-0 text-muted-foreground">
        Loading open times…
      </MicroLabel>
      <div className="grid flex-1 auto-rows-min grid-cols-1 content-start gap-2.5 sm:grid-cols-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={`slot-sk-${i}`}
            className="h-[3.25rem] w-full min-w-0 rounded-[var(--radius-md)]"
          />
        ))}
      </div>
    </div>
  );
}

function SlotTimesScrollArea({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const shell =
    "rounded-[var(--radius-md)] border border-border/70 bg-background shadow-sm";
  const pad = "p-2.5 sm:p-3.5";
  if (!enabled) {
    return (
      <div
        className={cn(
          shell,
          pad,
          "flex min-h-0 flex-1 flex-col xl:min-h-0",
        )}
      >
        {children}
      </div>
    );
  }
  return (
    <ScrollArea
      className={cn(
        shell,
        "min-h-[12rem] w-full max-h-[min(17rem,42vh)] xl:flex-1 xl:max-h-none xl:min-h-0 xl:h-full",
      )}
    >
      <div className={pad}>{children}</div>
    </ScrollArea>
  );
}

function PublicBookingHero({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeader
        eyebrow="Book a visit"
        title={clinicName}
        description={`Request a visit at this ${facilityLabel.toLowerCase()} in a few minutes — pick a day (and optionally a doctor/time), add your contact details, then send the request for the team to confirm.`}
        descriptionClassName="max-w-none min-w-0 text-[length:var(--fs-sm)] leading-tight whitespace-nowrap overflow-x-auto pb-0.5 [scrollbar-width:thin]"
        actions={
          <Badge
            variant="secondary"
            className="normal-case tracking-tight text-[length:var(--fs-xs)] font-medium"
          >
            {facilityLabel}
          </Badge>
        }
        className="gap-2 border-b border-border/60 pb-3 sm:gap-2.5 sm:pb-4"
      />
      <div className="ui-card-surface rounded-[var(--radius-md)] px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5 sm:gap-y-1">
          <MicroLabel as="p" className="mt-0 shrink-0 sm:pt-0.5">
            How this works
          </MicroLabel>
          <p className="min-w-0 text-[length:var(--fs-xs)] leading-snug text-muted-foreground sm:flex-1">
            {bookingSteps.map((step, index) => (
              <span key={step}>
                {index > 0 ? (
                  <span className="text-border/80" aria-hidden>
                    {" "}
                    ·{" "}
                  </span>
                ) : null}
                <span className="font-medium text-foreground">{index + 1}.</span>{" "}
                {step}
              </span>
            ))}
          </p>
        </div>
        <Separator className="my-2 bg-border/60 sm:my-2.5" />
        <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-background py-2 shadow-sm [&>svg]:left-3 [&>svg]:top-2.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary [&>svg~*]:pl-6">
          <ShieldCheck className="shrink-0" aria-hidden />
          <AlertTitle className="mb-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide">
            Private booking link
          </AlertTitle>
          <AlertDescription className="text-[length:var(--fs-2xs)] leading-snug text-muted-foreground">
            Only you and this care team see what you enter. Submitting is a request
            until staff confirms your visit.
          </AlertDescription>
        </Alert>
      </div>
    </div>
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
    <Card className={cn(bookingCardClass, "flex flex-col")}>
      <CardHeader className="border-b border-border/60 bg-muted/30 py-4">
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
    <Card className={cn(bookingCardClass, "flex flex-col")}>
      <CardHeader className="border-b border-border/60 bg-muted/30 py-4">
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
            "rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm transition-colors duration-150",
            selectedDoctorName &&
              "border-primary/50 bg-primary/[0.06] shadow-md",
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
              "rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm transition-colors duration-150",
              selectedCalendarDay &&
                "border-primary/50 bg-primary/[0.06] shadow-md",
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
              "rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm transition-colors duration-150",
              selectedStart &&
                selectedEnd &&
                "border-primary/50 bg-primary/[0.06] shadow-md",
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
    <Card className={cn(bookingCardClass, className)}>
      <CardContent className="space-y-4 py-4 sm:space-y-5 sm:py-5">
        <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 py-3.5 shadow-sm [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-primary [&>svg~*]:pl-7">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <AlertTitle className="text-[length:var(--fs-sm)]">
            Request, not a confirmed visit
          </AlertTitle>
          <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
            Submitting sends a request only. The care team still confirms before it
            is a firm appointment.
          </AlertDescription>
        </Alert>
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
      </CardContent>
    </Card>
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

const ANY_DOCTOR_ID = "__ANY__";

export function PublicBookingPage({ referralCode }: PublicBookingPageProps) {
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

  useEffect(() => {
    setTimeRangeStart("");
    setTimeRangeEnd("");
  }, [slotDate, doctorId]);

  const pageState = useMemo(() => {
    if (clinicQuery.isLoading) return "loading" as const;
    if (clinicQuery.isError) return "error" as const;
    return "success" as const;
  }, [clinicQuery.isLoading, clinicQuery.isError]);

  const handleSelectSlot = useCallback((startIso: string, endIso: string) => {
    setSelectedStart(startIso);
    setSelectedEnd(endIso);
    setSelectedSlotDoctorId(null);
  }, []);

  const handleSelectSlotWithDoctor = useCallback(
    (startIso: string, endIso: string, slotDoctorId: string) => {
      setSelectedStart(startIso);
      setSelectedEnd(endIso);
      setSelectedSlotDoctorId(slotDoctorId);
    },
    [],
  );

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
    if (!slotDate) {
      showUserFacingErrorToast(
        null,
        "Choose a date for your appointment request.",
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

      const resolvedDoctorId =
        doctorId === ANY_DOCTOR_ID ? selectedSlotDoctorId : doctorId || null;
      const includeSlot = Boolean(selectedStart && selectedEnd);

      await submit.mutateAsync({
        body: {
          phoneNumber: phone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
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
      showUserFacingErrorToast(
        error,
        "We could not submit your request. Please try again.",
        "generic",
      );
    }
  };

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
        <PublicBookingThemeToggle />
        <div className="mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card px-5 py-9 text-center shadow-sm sm:px-8 sm:py-11">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-success/[0.12] to-transparent"
            />
            <div className="relative space-y-5">
              <div
                className="mx-auto flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-success/25 bg-gradient-to-br from-success/22 to-success/8 text-success shadow-md"
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
              <Separator className="mx-auto max-w-xs bg-border/45" />
              <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-background text-left shadow-sm [&>svg]:text-primary">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <AlertTitle className="text-[length:var(--fs-sm)]">
                  What happens next
                </AlertTitle>
                <AlertDescription className="space-y-2 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  <p>
                    Watch for a message or call from the clinic — timing depends on
                    their usual confirmation workflow.
                  </p>
                  <p className="text-[length:var(--fs-2xs)] sm:text-[length:var(--fs-xs)]">
                    Save this tab if you want a bookmark, or close it anytime.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
        <PublicBookingPoweredByFooter className="mt-10 max-w-md" />
      </AppPageScaffold>
    );
  }
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
      <PublicBookingThemeToggle />
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
                  <Card className={cn(bookingCardClass, "flex flex-col")}>
                    <CardHeader className="border-b border-border/60 bg-muted/30 py-4 sm:py-5">
                      <BookingSectionHeader
                        icon={Lock}
                        micro="Before you continue"
                        title="Quick verification"
                        description="This protects the page from automated abuse. Your visit details stay private."
                        tone="neutral"
                      />
                    </CardHeader>
                    <CardContent className="bg-muted/30 px-4 py-5 sm:px-6">
                      <TurnstileWidget
                        siteKey={siteKey}
                        onToken={(t) => setTurnstileToken(t)}
                        onExpire={() => setTurnstileToken(null)}
                        className="flex w-full justify-center [&_iframe]:max-w-full"
                      />
                    </CardContent>
                  </Card>
                ) : null}

                <Card className={cn(bookingCardClass, "flex flex-col")}>
                  <CardHeader className="border-b border-border/60 bg-muted/30 py-4 sm:py-5">
                    <BookingSectionHeader
                      icon={CalendarIcon}
                      micro="Appointment"
                      title="Doctor, date, and time"
                      description="Select who you would like to see, pick a day, then tap an open slot that works for you."
                    />
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="pb-doctor-select"
                        className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
                      >
                        Doctor
                      </Label>
                      <Select
                        value={doctorId}
                        onValueChange={(v) => {
                          setDoctorId(v);
                          setSelectedStart(null);
                          setSelectedEnd(null);
                          setSelectedSlotDoctorId(null);
                        }}
                      >
                        <SelectTrigger
                          id="pb-doctor-select"
                          className="h-11 w-full rounded-[var(--radius-md)] border-border/70 bg-background text-[length:var(--fs-sm)] shadow-sm sm:h-11"
                          aria-label="Doctor"
                          disabled={doctorsQuery.isLoading}
                        >
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(doctorsQuery.data?.doctors ?? []).length > 1 ? (
                            <SelectItem value={ANY_DOCTOR_ID}>
                              Any available doctor
                            </SelectItem>
                          ) : null}
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

                    <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.82fr)] xl:items-stretch xl:gap-6">
                      <div className="flex flex-col gap-3 xl:h-full xl:min-h-0">
                        <MicroLabel as="p" className="mt-0">
                          Preferred day
                        </MicroLabel>
                        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-background p-2.5 shadow-sm sm:p-3.5">
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
                        <div className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3">
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
                          <p className="mt-1 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                            Pick a day now. The clinic will confirm the exact
                            time after approval.
                          </p>
                        </div>
                      </div>

                      <div className="flex min-h-0 flex-col gap-3 xl:h-full xl:min-h-0">
                        <MicroLabel as="p" className="mt-0 shrink-0">
                          Open times that day
                        </MicroLabel>
                        <div className="flex min-h-0 flex-1 flex-col">
                        {!doctorId ? (
                          <EmptyState
                            icon={UserCircle}
                            title="Doctor selection is optional"
                            description="If you choose a doctor, you can pick an exact time. Otherwise, you can request a date only and the clinic will assign a doctor and time."
                            className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/70 bg-muted/10 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                          />
                        ) : slotsQuery.isLoading ? (
                          <SlotTimesSkeletonGrid />
                        ) : slotsQuery.isError ? (
                          <div className="flex min-h-0 flex-1 flex-col gap-3 xl:justify-center">
                            <Alert
                              variant="destructive"
                              className="rounded-[var(--radius-md)] text-left [&>svg]:top-3.5"
                            >
                              <Clock className="h-4 w-4 shrink-0" aria-hidden />
                              <AlertTitle>Open times unavailable</AlertTitle>
                              <AlertDescription>
                                Open times could not be loaded. Check your
                                connection and try again.
                              </AlertDescription>
                            </Alert>
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
                          <EmptyState
                            icon={CalendarIcon}
                            title="No times this day"
                            description={publicBookingSlotEmptyMessage(
                              slotsQuery.data?.slotListEmptyReason,
                            )}
                            className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/70 bg-muted/10 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                          />
                        ) : availableSlots.length === 0 ? (
                          <div className="flex min-h-0 flex-1 flex-col gap-3">
                            <EmptyState
                              icon={Clock}
                              title="No openings left"
                              description="There are no free times left on this date. The times below are already booked, blocked, or earlier in the day. Choose another date if you need an opening."
                              className="shrink-0 rounded-[var(--radius-md)] border border-dashed border-border/70 bg-muted/10 py-5 shadow-sm sm:py-6 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                            />
                            <SlotTimesScrollArea enabled={allSlots.length > 6}>
                              <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                                {allSlots.map((s) => (
                                  <li
                                    key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                                    className="min-w-0"
                                  >
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled
                                      className="h-auto min-h-[3.25rem] w-full min-w-0 cursor-not-allowed justify-start rounded-[var(--radius-md)] border-border/70 bg-muted/25 px-4 py-3 text-left opacity-80 shadow-sm"
                                      aria-label={`${formatTime(s.startTime)} to ${formatTime(s.endTime)}, unavailable`}
                                    >
                                      <span className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                                        <span className="text-[length:var(--fs-sm)] font-medium tracking-tight text-muted-foreground">
                                          {formatTime(s.startTime)}{" "}
                                          <span
                                            aria-hidden
                                            className="font-normal text-muted-foreground/80"
                                          >
                                            -
                                          </span>{" "}
                                          {formatTime(s.endTime)}
                                        </span>
                                        <span className="truncate text-[length:var(--fs-xs)] text-muted-foreground">
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
                            </SlotTimesScrollArea>
                          </div>
                        ) : (
                          <SlotTimesScrollArea
                            enabled={filteredAvailableSlots.length > 6}
                          >
                            <div className="mb-3 grid gap-3 rounded-[var(--radius-md)] border border-border/70 bg-card p-3 shadow-sm sm:grid-cols-2 sm:items-end sm:p-4">
                              <div className="grid gap-2">
                                <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
                                  Time range (from)
                                </Label>
                                <Select
                                  value={timeRangeStart}
                                  onValueChange={(v) => {
                                    setTimeRangeStart(v);
                                    if (timeRangeEnd) {
                                      const s = new Date(v).getTime();
                                      const e = new Date(timeRangeEnd).getTime();
                                      if (
                                        Number.isFinite(s) &&
                                        Number.isFinite(e) &&
                                        e <= s
                                      ) {
                                        setTimeRangeEnd("");
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                                    <SelectValue placeholder="Any time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Any time</SelectItem>
                                    {timeRangeOptions.starts.map((t) => (
                                      <SelectItem key={t} value={t}>
                                        {formatTime(t)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
                                  Time range (to)
                                </Label>
                                <Select
                                  value={timeRangeEnd}
                                  onValueChange={setTimeRangeEnd}
                                >
                                  <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                                    <SelectValue placeholder="Any time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Any time</SelectItem>
                                    {timeRangeOptions.ends.map((t) => (
                                      <SelectItem key={t} value={t}>
                                        {formatTime(t)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {filteredAvailableSlots.length === 0 ? (
                              <EmptyState
                                icon={Clock}
                                title="No openings in this time range"
                                description="Try a wider window or clear the time range to see all openings for this day."
                                className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/70 bg-muted/10 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                              />
                            ) : (
                              <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                                {filteredAvailableSlots.map((s) => {
                                  const selected =
                                    selectedStart === s.startTime &&
                                    (doctorId !== ANY_DOCTOR_ID ||
                                      selectedSlotDoctorId === s.doctorId);
                                  return (
                                    <li
                                      key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                                      className="min-w-0"
                                    >
                                      <Button
                                        type="button"
                                        variant={selected ? "default" : "outline"}
                                        className={cn(
                                          "h-auto min-h-[3.25rem] w-full min-w-0 justify-start rounded-[var(--radius-md)] px-4 py-3 text-left outline-none ring-offset-background transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                                          selected
                                            ? "shadow-md ring-2 ring-primary/45 ring-offset-2 ring-offset-background border border-primary/40"
                                            : "touch-manipulation border-border/70 shadow-sm hover:border-primary/35 hover:bg-muted/25 hover:shadow-md",
                                        )}
                                        onClick={() =>
                                          doctorId === ANY_DOCTOR_ID
                                            ? handleSelectSlotWithDoctor(
                                                s.startTime,
                                                s.endTime,
                                                s.doctorId,
                                              )
                                            : handleSelectSlot(
                                                s.startTime,
                                                s.endTime,
                                              )
                                        }
                                      >
                                        <span className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                                          <span
                                            className={cn(
                                              "text-[length:var(--fs-sm)] font-medium tracking-tight",
                                              selected &&
                                                "text-primary-foreground",
                                            )}
                                          >
                                            {formatTime(s.startTime)}{" "}
                                            <span
                                              aria-hidden
                                              className={cn(
                                                "font-normal",
                                                selected
                                                  ? "text-primary-foreground/85"
                                                  : "text-muted-foreground/90",
                                              )}
                                            >
                                              -
                                            </span>{" "}
                                            {formatTime(s.endTime)}
                                          </span>
                                          {s.doctorName ? (
                                            <span
                                              className={cn(
                                                "truncate text-[length:var(--fs-xs)]",
                                                selected
                                                  ? "text-primary-foreground/90"
                                                  : "text-muted-foreground",
                                              )}
                                            >
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
                            )}
                          </SlotTimesScrollArea>
                        )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(bookingCardClass, "flex flex-col")}>
                  <CardHeader className="border-b border-border/60 bg-muted/30 py-4 sm:py-5">
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
                  <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 sm:px-6 sm:py-6">
                    <BookingTextField
                      id="pb-first-name"
                      label="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                    <BookingTextField
                      id="pb-last-name"
                      label="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                    <Separator className="sm:col-span-2 sm:my-0.5" />
                    <BookingTextField
                      id="pb-phone"
                      label="Phone number"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setRequiresOtp(null);
                        setVerificationToken(null);
                      }}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                    <BookingTextField
                      id="pb-email"
                      label="Email"
                      placeholder="Enter email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      type="email"
                    />
                    <BookingTextField
                      id="pb-reason"
                      label="Reason for visit"
                      placeholder="Enter reason for visit"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      containerClassName="sm:col-span-2"
                    />
                    <div className="grid gap-2 sm:col-span-2">
                      <Label
                        htmlFor="pb-notes"
                        className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
                      >
                        Notes for the team
                      </Label>
                      <Textarea
                        id="pb-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter notes for the team"
                        maxLength={1000}
                        className="min-h-[96px] rounded-[var(--radius-md)] border-border/80 bg-background text-[length:var(--fs-sm)] shadow-sm"
                      />
                    </div>
                  </CardContent>
                </Card>

            {requiresOtp === false ? (
              <Card
                className={cn(
                  bookingCardClass,
                  "flex flex-col border-border/70 bg-muted/30 shadow-sm",
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
                  "flex flex-col border-primary/35 bg-gradient-to-br from-primary/[0.07] to-transparent shadow-sm",
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
                  <BookingTextField
                    id="pb-otp"
                    label="Verification code"
                    placeholder="Enter verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
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
              <Card
                className={cn(
                  bookingCardClass,
                  "flex flex-col transition-colors duration-150",
                )}
              >
                <CardHeader className="border-b border-border/60 bg-muted/30 pb-4 pt-5 sm:pb-6 sm:pt-6">
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
                <CardContent className="bg-background px-4 pt-5 sm:px-6 sm:pt-6">
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
                      <div className="space-y-5">
                        {contextQuery.data.patientSince ? (
                          <div className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm">
                            <DescriptionList
                              columns={1}
                              orientation="vertical"
                              items={[
                                {
                                  term: (
                                    <span className="inline-flex items-center gap-2 font-medium uppercase tracking-wide">
                                      <Building2
                                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                        aria-hidden
                                      />
                                      Patient since
                                    </span>
                                  ),
                                  description: formatDate(
                                    new Date(contextQuery.data.patientSince),
                                    "d MMMM yyyy",
                                  ),
                                },
                              ]}
                            />
                          </div>
                        ) : null}
                        {contextQuery.data.appointments.length === 0 ? (
                          <EmptyState
                            icon={CalendarIcon}
                            title="No prior visits on file"
                            description="You are all set to request a new time at this location."
                            className="rounded-[var(--radius-md)] border border-dashed border-border/80 bg-background/80 py-6 sm:py-7 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                          />
                        ) : (
                          <div className="space-y-3">
                            <MicroLabel as="p" className="mt-0">
                              Recent visits
                            </MicroLabel>
                            <Timeline
                              className="space-y-3"
                              items={contextQuery.data.appointments.map(
                                (a) => ({
                                  id: a.id,
                                  title: a.doctorName ?? "Doctor",
                                  description: formatDateTime(a.startTime),
                                  meta: (
                                    <Badge
                                      variant="secondary"
                                      className="w-fit shrink-0"
                                    >
                                      {formatAppointmentStatus(a.status)}
                                    </Badge>
                                  ),
                                  accent: appointmentTimelineAccent(a.status),
                                }),
                              )}
                            />
                          </div>
                        )}
                      </div>
                    ) : null}
                  </DataState>
                </CardContent>
              </Card>
            ) : null}

                <BookingActionPanel
                  className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 border border-border/70 bg-card shadow-lg supports-[backdrop-filter]:backdrop-blur-sm lg:hidden"
                  onPhoneCheck={() => void runPhoneCheck().catch(() => undefined)}
                  onSubmit={() => void handleSubmit()}
                  canCheckPhone={phone.trim().length > 0}
                  isPhoneCheckPending={phoneCheck.isPending}
                  isSubmitting={submit.isPending}
                />
              </div>
            </div>
            <PublicBookingPoweredByFooter className="mt-4 sm:mt-6" />
          </div>
        ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
