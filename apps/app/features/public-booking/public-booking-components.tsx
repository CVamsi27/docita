"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { CategoryAvatar } from "@workspace/ui/components/category-avatar";
import { DocitaLogo, DocitaWordmark } from "@workspace/ui/components/docita-logo";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatDate } from "@workspace/utils";
import { SupportContact } from "@/components/common/support-contact";
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { formatTime } from "@/lib/formatters";
import {
  PUBLIC_BOOKING_MAIN_CONTENT_ID,
  PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS,
  PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS,
} from "@/features/public-booking/public-booking-constants";
import { SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING } from "@/lib/support-contact";
import { cn } from "@workspace/ui/lib/utils";
import type { PublicBookingClinicResponse, PublicBookingSlotListEmptyReason } from "@workspace/types";
import type { TimelineItem } from "@workspace/ui/components/timeline";
import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";


export const bookingCardClass = "gap-0 overflow-hidden py-0 sm:gap-0 sm:py-0";

/** Origin-style outer chrome for major booking tiles */
export const bookingSectionShell =
  "rounded-[var(--radius-lg)] border border-border/60 bg-card shadow-sm overflow-hidden";

/** Muted header strip for CardHeader regions */
export const bookingSectionHeaderBar =
  "border-b border-border/50 bg-surface-2";

export const bookingSteps = [
  "Choose a preferred day (optionally doctor/time)",
  "Share your contact details",
  "Send the request for confirmation",
] as const;

export function publicBookingSlotEmptyMessage(
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

export function formatAppointmentStatus(status: string): string {
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

export function appointmentTimelineAccent(status: string): NonNullable<
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

/** Skip past chrome for keyboard / screen reader users (targets `#public-booking-main`). */
export function PublicBookingSkipLink() {
  return (
    <Button
      asChild
      variant="primary"
      className={cn(
        "absolute left-4 z-[60] h-auto rounded-[var(--radius-md)] px-4 py-2.5 text-[length:var(--fs-sm)] font-semibold shadow-md",
        "top-[calc(env(safe-area-inset-top)+0.35rem)] -translate-y-[140%] opacity-0 pointer-events-none",
        "focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100",
      )}
    >
      <a href={`#${PUBLIC_BOOKING_MAIN_CONTENT_ID}`}>Skip to booking content</a>
    </Button>
  );
}

/** Sticky logo + theme toggle (replaces the legacy floating toggle). */
export function PublicBookingTopChrome() {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-b-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm",
        "pb-1.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:pb-2",
      )}
      aria-label="Booking page"
    >
      <div className="mx-auto grid h-9 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 items-center leading-none">
          <DocitaWordmark className="block h-[26px] max-h-[26px] w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-7 sm:max-h-7 sm:max-w-[12.5rem] md:h-8 md:max-h-8" />
        </div>
        <div className="hidden items-center gap-1.5 text-[length:var(--fs-2xs)] text-muted-foreground sm:flex" aria-hidden>
          <Lock className="h-3 w-3 shrink-0" />
          <span>Private booking</span>
        </div>
        <div className="flex items-center justify-end">
          <ThemeToggleWithAppearanceSync />
        </div>
      </div>
    </header>
  );
}

export function PublicBookingTrustRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[length:var(--fs-2xs)] text-muted-foreground",
        className,
      )}
      aria-label="Security and privacy"
    >
      <span className="inline-flex items-center gap-1">
        <Shield className="h-3 w-3 shrink-0" aria-hidden />
        Encrypted
      </span>
      <span aria-hidden className="select-none">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        Private
      </span>
    </div>
  );
}

export function PublicBookingPageFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl space-y-1 max-md:max-w-lg sm:space-y-2",
        className,
      )}
    >
      <PublicBookingPoweredByFooter />
      <SupportContact
        layout="inline"
        variant="compact"
        minimalLinks
        whatsappMessage={SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING}
        className="max-w-xl lg:mx-auto"
      />
    </div>
  );
}

export function PublicBookingPoweredByFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-6xl border-t border-border/30 pt-1.5 sm:pt-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-8 sm:gap-y-1">
        <PublicBookingTrustRow />
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-auto min-h-0 gap-1 rounded-full px-2 py-0 text-[length:var(--fs-2xs)] font-normal text-muted-foreground hover:bg-muted/35 hover:text-foreground sm:gap-1.5 sm:px-2.5 sm:py-0.5"
        >
          <a
            href="https://docita.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            <span className="font-medium text-foreground/85">Powered by</span>
            <DocitaLogo
              showText={false}
              className="h-4 w-4 sm:h-5 sm:w-5"
              iconClassName="h-4 w-4 sm:h-5 sm:w-5"
            />
          </a>
        </Button>
      </div>
    </footer>
  );
}

export function BookingSectionHeader({
  icon: Icon,
  micro,
  title,
  description,
  tone = "primary",
  variant = "full",
}: {
  icon: LucideIcon;
  micro: string;
  title: string;
  description: ReactNode;
  tone?: "info" | "success" | "warning" | "destructive" | "primary" | "neutral";
  variant?: "full" | "compact";
}) {
  const isCompact = variant === "compact";
  return (
    <div className={cn("flex", isCompact ? "gap-3 sm:gap-3" : "gap-3.5 sm:gap-4")}>
      <CategoryAvatar
        icon={<Icon strokeWidth={1.5} />}
        tone={tone}
        size={isCompact ? "md" : "lg"}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 space-y-1">
        <MicroLabel as="h3">{micro}</MicroLabel>
        {isCompact ? null : (
          <CardTitle className="text-[length:var(--fs-xl)] font-semibold tracking-tight sm:text-[length:var(--fs-2xl)]">
            {title}
          </CardTitle>
        )}
        <CardDescription
          className={cn(
            "max-w-prose text-pretty",
            isCompact
              ? "text-[length:var(--fs-xs)] leading-relaxed sm:text-[length:var(--fs-sm)]"
              : "text-[length:var(--fs-sm)] sm:text-[length:var(--fs-base)]",
          )}
        >
          {description}
        </CardDescription>
      </div>
    </div>
  );
}

/** Desktop hero card: gradient banner with clinic name, badges, and trust indicators. */
export function PublicBookingHeroCompact({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/50 bg-card shadow-sm">
      {/* Accent bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
        aria-hidden
      />
      {/* Background tint */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.045] via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative grid grid-cols-[1fr_auto] items-start gap-x-8 gap-y-4 px-7 py-6 lg:px-8 lg:py-7">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide text-primary">
              Online booking
            </span>
            <Badge
              variant="secondary"
              className="normal-case text-[length:var(--fs-2xs)] font-medium"
            >
              {facilityLabel}
            </Badge>
          </div>
          <h1 className="font-serif text-[length:var(--fs-3xl)] font-semibold leading-tight tracking-tight text-foreground">
            {clinicName}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            <span>
              Fill in the steps below to request a visit. Staff confirm before it&apos;s final.
            </span>
            <PublicBookingHowItWorksSheet appearance="inline" />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <PublicBookingTrustRow className="flex-col items-end gap-x-0 gap-y-1.5" />
        </div>
      </div>
    </div>
  );
}

/** Slim sticky wizard chrome: clinic strip + progress (mobile). */
export function PublicBookingProgressChrome({
  clinicName,
  facilityWord,
  stepIndex,
  stepCount,
}: {
  clinicName: string;
  facilityWord: string;
  stepIndex: number;
  stepCount: number;
}) {
  const pct = Math.round(((stepIndex + 1) / stepCount) * 100);
  return (
    <header
      className={cn(
        PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS,
        "z-20 mx-0 overflow-hidden rounded-b-[var(--radius-lg)] border-x border-b border-border/50 border-t border-t-primary/20 bg-card/98 px-3 pb-2.5 pt-2 shadow-xs ring-1 ring-border/25 supports-[backdrop-filter]:backdrop-blur-md sm:mx-1 sm:px-4 sm:pb-3 sm:pt-2.5",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-primary/[0.06] to-transparent"
      />
      <div className="relative flex min-h-9 min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-[length:var(--fs-base)] font-semibold leading-snug tracking-tight text-foreground sm:text-[length:var(--fs-lg)]">
            {clinicName}
          </h1>
          <p className="text-[length:var(--fs-2xs)] leading-none text-muted-foreground sm:text-[length:var(--fs-xs)]">
            {facilityWord}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5"
          aria-label={`Step ${stepIndex + 1} of ${stepCount}`}
        >
          {Array.from({ length: stepCount }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className={cn(
                "rounded-full transition-[width,height] duration-300",
                i < stepIndex
                  ? "h-2 w-2 bg-primary/60"
                  : i === stepIndex
                    ? "h-2 w-5 bg-primary sm:w-6"
                    : "h-2 w-2 bg-border",
              )}
            />
          ))}
        </div>
      </div>
      <Progress
        value={pct}
        className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
        aria-label={`Booking progress: step ${stepIndex + 1} of ${stepCount}`}
      />
    </header>
  );
}

export function PublicBookingHowItWorksSheet({
  triggerClassName,
  appearance = "link",
}: {
  triggerClassName?: string;
  /**
   * `chip`: pill in dense mobile rows; `inline`: small pill beside hero copy (web);
   * `link`: text-style trigger.
   */
  appearance?: "link" | "chip" | "inline";
}) {
  const isChip = appearance === "chip";
  const isInline = appearance === "inline";
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={isChip || isInline ? "outline" : "ghost"}
          className={cn(
            isChip &&
              "h-8 shrink-0 rounded-full px-3 text-[length:var(--fs-2xs)] font-semibold tracking-tight text-foreground shadow-xs transition-colors duration-150 hover:bg-muted/40",
            isInline &&
              "h-7 shrink-0 rounded-full border-border/70 px-2.5 py-0 text-[length:var(--fs-2xs)] font-semibold tracking-tight text-muted-foreground shadow-none transition-colors duration-150 hover:border-border hover:bg-muted/30 hover:text-foreground",
            !isChip &&
              !isInline &&
              "h-auto min-h-0 justify-start p-0 text-[length:var(--fs-xs)] font-medium text-primary underline-offset-4 hover:underline",
            triggerClassName,
          )}
        >
          How this works
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isInline ? "right" : "bottom"}
        className={cn(
          "gap-0 px-0",
          isInline
            ? "h-full max-h-[100dvh] w-[min(100%,22rem)] flex-col border-l pb-6 pt-2 sm:max-w-sm"
            : "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-2 text-left sm:px-6">
          <SheetTitle className="text-left text-[length:var(--fs-lg)]">
            How booking works
          </SheetTitle>
          <SheetDescription className="text-left text-[length:var(--fs-xs)]">
            Three quick steps before the clinic confirms your visit.
          </SheetDescription>
        </SheetHeader>
        <div
          className={cn(
            "overflow-y-auto px-4 py-4 sm:px-6",
            isInline ? "min-h-0 flex-1 overscroll-contain" : "max-h-[min(60vh,28rem)]",
          )}
        >
          <ol className="list-decimal space-y-2 pl-5 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            {bookingSteps.map((step) => (
              <li key={step}>
                <span className="font-medium text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <Alert className="mt-4 rounded-[var(--radius-md)] border border-border/70 bg-background shadow-sm [&>svg]:left-3 [&>svg]:top-3 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary [&>svg~*]:pl-6">
            <ShieldCheck className="shrink-0" aria-hidden />
            <AlertTitle className="mb-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide">
              Private booking link
            </AlertTitle>
            <AlertDescription className="text-[length:var(--fs-2xs)] leading-snug text-muted-foreground">
              Only you and this care team see what you enter. Submitting is a request until staff
              confirms your visit.
            </AlertDescription>
          </Alert>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PublicBookingSummaryPeek({
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
  const hasSlot = Boolean(selectedCalendarDay && selectedStart && selectedEnd);
  const hasAll = Boolean(selectedDoctorName) && hasSlot;
  const hasAny = Boolean(selectedDoctorName) || hasSlot;

  const line = hasAll
    ? `${selectedDoctorName} · ${formatDate(selectedCalendarDay!, "EEE d MMM")} · ${formatTime(selectedStart!)}–${formatTime(selectedEnd!)}`
    : hasSlot
      ? `${formatDate(selectedCalendarDay!, "EEE d MMM")} · ${formatTime(selectedStart!)}–${formatTime(selectedEnd!)}`
      : selectedDoctorName
        ? selectedDoctorName
        : null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 text-left shadow-sm transition-colors duration-150 touch-manipulation sm:px-3 sm:py-2",
            hasAny
              ? "border-primary/40 bg-primary/[0.06] hover:bg-primary/[0.09]"
              : "border-border/70 bg-muted/25 hover:bg-muted/40",
          )}
          aria-label="Your request summary"
        >
          <span className="min-w-0 flex-1">
            <MicroLabel
              as="span"
              className={cn(
                "mt-0 block text-[length:var(--fs-2xs)] font-medium",
                hasAny ? "text-primary/80" : "text-muted-foreground",
              )}
            >
              Your visit
            </MicroLabel>
            <span className={cn(
              "block truncate text-[length:var(--fs-xs)] font-medium leading-snug sm:text-[length:var(--fs-sm)]",
              hasAny ? "text-foreground" : "text-muted-foreground/80",
            )}>
              {line ?? "No day or slot selected yet"}
            </span>
          </span>
          <ChevronDown className={cn(
            "size-3.5 shrink-0 sm:size-4",
            hasAny ? "text-primary/70" : "text-muted-foreground",
          )} aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-2 text-left sm:px-6">
          <SheetTitle className="text-left text-[length:var(--fs-lg)]">Your request</SheetTitle>
          <SheetDescription className="text-left text-[length:var(--fs-xs)]">
            Doctor, day, and time for this visit request.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-4 sm:px-6">
          <RequestSummaryCard
            selectedDoctorName={selectedDoctorName}
            selectedCalendarDay={selectedCalendarDay}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            density="compact"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PublicBookingReviewBlock({
  c,
  onEdit,
}: {
  c: PublicBookingPageController;
  onEdit: (step: PublicBookingMobileStep, fieldId?: string) => void;
}) {
  const patient =
    c.firstName.trim() || c.lastName.trim()
      ? `${c.firstName.trim()} ${c.lastName.trim()}`.trim()
      : "—";

  const dayLabel = c.selectedCalendarDay
    ? formatDate(c.selectedCalendarDay, "EEE, d MMM yyyy")
    : "—";

  const timeLabel =
    c.selectedStart && c.selectedEnd
      ? `${formatTime(c.selectedStart)} – ${formatTime(c.selectedEnd)}`
    : "Date only (no slot)";

  const doctorLabel = c.selectedDoctorName ?? "—";

  function Row({
    label,
    value,
    editStep,
    fieldId,
  }: {
    label: string;
    value: string;
    editStep: PublicBookingMobileStep;
    fieldId?: string;
  }) {
    return (
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0">
        <div className="min-w-0 flex-1 space-y-0.5">
          <MicroLabel as="p" className="mt-0">
            {label}
          </MicroLabel>
          <p className="text-[length:var(--fs-sm)] font-medium leading-snug text-foreground">
            {value}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-[length:var(--fs-xs)]"
          onClick={() => onEdit(editStep, fieldId)}
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(bookingSectionShell, bookingCardClass, "flex flex-col bg-card")}>
      <div className={cn(bookingSectionHeaderBar, "px-4 py-3 sm:px-5 sm:py-4")}>
        <MicroLabel as="h2" className="mt-0">
          Review
        </MicroLabel>
        <p className="mt-1 font-serif text-[length:var(--fs-xl)] font-semibold tracking-tight text-foreground">
          Confirm before you send
        </p>
        <p className="mt-1 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
          Submitting sends a request only — the clinic confirms before your visit is final.
        </p>
      </div>
      <div className="px-4 pb-4 pt-0 sm:px-5">
        <Row
          label="Doctor"
          value={doctorLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.doctor}
        />
        <Row
          label="Day"
          value={dayLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.preferredDay}
        />
        <Row
          label="Time"
          value={timeLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.openTimes}
        />
        <Row
          label="Patient"
          value={patient}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone}
        />
        <Row
          label="Phone"
          value={c.phone.trim() || "—"}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone}
        />
        <Row
          label="Reason for visit"
          value={c.reason.trim() || "—"}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.reason}
        />
      </div>
    </div>
  );
}

export function PublicBookingDoneCard({
  clinicName,
  facilityWord,
  phone,
  address,
}: {
  clinicName: string;
  facilityWord: string;
  phone?: string | null;
  address?: string | null;
}) {
  return (
    <Card className={cn(bookingCardClass, bookingSectionShell, "mx-auto w-full max-w-md overflow-hidden text-center")}>
      <div className="pointer-events-none h-1.5 w-full bg-gradient-to-r from-success/60 via-success to-success/60" aria-hidden />
      <CardContent className="space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="relative mx-auto w-fit" aria-hidden>
          <div className="absolute inset-0 scale-110 rounded-full bg-success/20 blur-md" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-success/25 bg-success/[0.1] text-success shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
            <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <MicroLabel as="p" className="mt-0 text-success/80">
            Request sent
          </MicroLabel>
          <h2 className="font-serif text-[length:var(--fs-2xl)] font-semibold tracking-tight text-foreground sm:text-[length:var(--fs-3xl)]">
            You&apos;re all set
          </h2>
          <p className="mx-auto max-w-sm text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            The care team will reach out to confirm your visit using the contact method they have on file.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-4 py-4 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <CategoryAvatar
              icon={<MapPin strokeWidth={1.5} />}
              tone="primary"
              size="sm"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <MicroLabel as="p" className="mt-0">
                {facilityWord}
              </MicroLabel>
              <p className="font-medium text-[length:var(--fs-base)] text-foreground leading-snug">{clinicName}</p>
              {address ? (
                <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  {address}
                </p>
              ) : null}
            </div>
          </div>
          {phone ? (
            <Button variant="outline" className="mt-4 h-10 w-full rounded-[var(--radius-md)]" asChild>
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 transition-colors duration-150"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                Call {clinicName}
              </a>
            </Button>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-md)] border border-border/50 bg-background px-4 py-3 text-left shadow-sm">
          <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
            What happens next
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              "The clinic reviews your request",
              "They contact you to confirm the time",
              "Your visit is confirmed once they reach out",
            ].map((step) => (
              <li key={step} className="flex items-start gap-2 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/70" aria-hidden />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


export function ClinicContactCard({
  clinic,
  className,
}: {
  clinic: PublicBookingClinicResponse;
  className?: string;
}) {
  const websiteHref = clinic.website
    ? clinic.website.startsWith("http")
      ? clinic.website
      : `https://${clinic.website}`
    : null;

  return (
    <Card
      className={cn(bookingCardClass, bookingSectionShell, "flex flex-col", className)}
    >
      <CardHeader className={cn(bookingSectionHeaderBar, "py-3.5 sm:py-4")}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-primary/20 bg-primary/[0.08] text-primary">
            <MapPin className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <MicroLabel as="h2" className="mt-0">Your location</MicroLabel>
            <CardTitle className="mt-0.5 truncate text-[length:var(--fs-base)] leading-snug tracking-tight">
              {clinic.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 py-3.5 sm:px-4 sm:py-4">
        {clinic.address ? (
          <div className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              {clinic.address}
            </p>
          </div>
        ) : null}
        {clinic.phone ? (
          <div className="flex items-center gap-2.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <a
              href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
              className="text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.phone}
            </a>
          </div>
        ) : null}
        {clinic.email ? (
          <div className="flex items-center gap-2.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <a
              href={`mailto:${clinic.email}`}
              className="min-w-0 truncate text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.email}
            </a>
          </div>
        ) : null}
        {clinic.website && websiteHref ? (
          <div className="flex items-center gap-2.5">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-[length:var(--fs-xs)] font-medium text-foreground underline-offset-4 hover:underline"
            >
              {clinic.website}
            </a>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">
            {clinic.timezone}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RequestSummaryCard({
  selectedDoctorName,
  selectedCalendarDay,
  selectedStart,
  selectedEnd,
  className,
  density = "default",
}: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
  className?: string;
  density?: "default" | "compact";
}) {
  const hasVisitSelection = Boolean(
    selectedDoctorName && selectedCalendarDay && selectedStart && selectedEnd,
  );
  const compact = density === "compact";
  const scheduleComplete = Boolean(
    selectedCalendarDay && selectedStart && selectedEnd,
  );
  const anyFilled = Boolean(selectedDoctorName || selectedCalendarDay);

  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col transition-shadow duration-200",
        hasVisitSelection && "shadow-md ring-1 ring-primary/15",
        className,
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          compact ? "py-3" : "py-3.5 sm:py-4",
          hasVisitSelection && "border-b-primary/20 bg-primary/[0.04]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors duration-200",
                compact ? "h-8 w-8" : "h-9 w-9",
                hasVisitSelection
                  ? "border-success/25 bg-success/[0.1] text-success"
                  : "border-border/60 bg-muted/30 text-muted-foreground",
              )}
            >
              <CalendarIcon
                className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <MicroLabel as="h2" className={cn("mt-0", hasVisitSelection && "text-success/80")}>
                {hasVisitSelection ? "Ready to send" : "Your request"}
              </MicroLabel>
              <CardTitle
                className={cn(
                  compact
                    ? "text-[length:var(--fs-base)]"
                    : "text-[length:var(--fs-base)] sm:text-[length:var(--fs-lg)]",
                )}
              >
                {hasVisitSelection ? "Visit summary" : anyFilled ? "In progress" : "Not started"}
              </CardTitle>
            </div>
          </div>
          {hasVisitSelection && (
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-success"
              strokeWidth={1.5}
              aria-hidden
            />
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("px-4", compact ? "space-y-2 py-3" : "space-y-3 py-4")}>
        <div
          className={cn(
            "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
            compact ? "p-2.5" : "p-3.5",
            selectedDoctorName &&
              "border-primary/50 bg-primary/[0.06] shadow-md",
          )}
        >
          <MicroLabel as="p" className="mt-0">
            Doctor
          </MicroLabel>
          <p
            className={cn(
              "mt-0.5 font-medium text-foreground",
              compact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]",
            )}
          >
            {selectedDoctorName ?? "Select a doctor"}
          </p>
        </div>
        {scheduleComplete ? (
          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-primary/50 bg-primary/[0.06] shadow-md transition-colors duration-150",
              compact ? "p-2.5" : "p-3.5",
            )}
          >
            <MicroLabel as="p" className="mt-0">
              Date & time
            </MicroLabel>
            <p
              className={cn(
                "mt-0.5 font-medium text-foreground",
                compact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]",
              )}
            >
              {formatDate(selectedCalendarDay!, "EEE d MMM")} ·{" "}
              {formatTime(selectedStart!)}–{formatTime(selectedEnd!)}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              compact ? "sm:grid-cols-2 sm:gap-2" : "gap-3 sm:grid-cols-2",
            )}
          >
            <div
              className={cn(
                "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
                compact ? "p-2.5" : "p-3.5",
                selectedCalendarDay &&
                  "border-primary/50 bg-primary/[0.06] shadow-md",
              )}
            >
              <MicroLabel as="p" className="mt-0">
                Day
              </MicroLabel>
              <p
                className={cn(
                  "mt-0.5 font-medium text-foreground",
                  compact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]",
                )}
              >
                {selectedCalendarDay
                  ? formatDate(selectedCalendarDay, "EEE d MMM")
                  : "Choose day"}
              </p>
            </div>
            <div
              className={cn(
                "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
                compact ? "p-2.5" : "p-3.5",
                selectedStart &&
                  selectedEnd &&
                  "border-primary/50 bg-primary/[0.06] shadow-md",
              )}
            >
              <MicroLabel as="p" className="mt-0">
                Time
              </MicroLabel>
              <p
                className={cn(
                  "mt-0.5 font-medium text-foreground",
                  compact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]",
                )}
              >
                {selectedStart && selectedEnd
                  ? `${formatTime(selectedStart)} - ${formatTime(selectedEnd)}`
                  : "Pick slot"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BookingActionPanel({
  onSubmit,
  isSubmitting,
  className,
  variant = "default",
  submitEnabled = true,
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  className?: string;
  variant?: "default" | "compact";
  /** When false, submit stays disabled (matches validation before sending). */
  submitEnabled?: boolean;
}) {
  const isCompact = variant === "compact";
  const submitBlocked = isSubmitting || !submitEnabled;
  return (
    <Card
      className={cn(
        bookingCardClass,
        !isCompact && bookingSectionShell,
        className,
      )}
    >
      <CardContent
        className={cn(
          isCompact ? "space-y-2.5 py-3 sm:py-3.5" : "space-y-3 py-4 sm:py-5",
        )}
      >
        <Button
          type="button"
          className={cn(
            "w-full rounded-[var(--radius-md)] px-6 font-semibold shadow-sm",
            isCompact
              ? "h-11 text-[length:var(--fs-sm)]"
              : "h-12 text-[length:var(--fs-base)]",
          )}
          onClick={onSubmit}
          disabled={submitBlocked}
        >
          {isSubmitting ? "Sending…" : "Send visit request"}
        </Button>
        <div className="flex items-start gap-2">
          <ShieldCheck
            className={cn(
              "mt-0.5 shrink-0 text-primary/60",
              isCompact ? "h-3 w-3" : "h-3.5 w-3.5",
            )}
            aria-hidden
          />
          <p
            className={cn(
              "leading-snug text-muted-foreground",
              isCompact ? "text-[length:var(--fs-2xs)]" : "text-[length:var(--fs-xs)]",
            )}
          >
            Submitting sends a request only — the care team confirms before it is a firm appointment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlotTimesSkeletonGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-[var(--radius-md)] border border-border/70 bg-card p-3 shadow-sm ring-1 ring-border/40 sm:p-4 xl:min-h-0 xl:flex-1",
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

export function SlotTimesScrollArea({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const shell =
    "rounded-[var(--radius-md)] border border-border/70 bg-background shadow-sm ring-1 ring-border/40";
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
