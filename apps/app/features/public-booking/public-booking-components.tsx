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
import { PageHeader } from "@workspace/ui/components/page-header";
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

export const contactTileClass =
  "flex min-w-0 gap-3 rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm transition-colors duration-150 hover:bg-muted/30";

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
        "sticky top-0 z-30 border-b-2 border-b-primary/12 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm",
        "pb-1.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:pb-2",
      )}
      aria-label="Booking page"
    >
      <div className="mx-auto grid h-9 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 items-center leading-none">
          <DocitaWordmark className="block h-[26px] max-h-[26px] w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-7 sm:max-h-7 sm:max-w-[12.5rem] md:h-8 md:max-h-8" />
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

/** Desktop/tablet hero: title + facility badge; how-it-works opens from a compact inline control. */
export function PublicBookingHeroCompact({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <PageHeader
        eyebrow="Book a visit"
        title={
          <span className="font-serif tracking-tight text-balance">{clinicName}</span>
        }
        description={
          <>
            <span className="text-pretty">
              {`Request a visit at this ${facilityLabel.toLowerCase()} in a few minutes.`}
            </span>{" "}
            <PublicBookingHowItWorksSheet appearance="inline" />
          </>
        }
        descriptionClassName="min-w-0 max-w-prose text-pretty text-[length:var(--fs-sm)] leading-snug sm:text-[length:var(--fs-base)] sm:leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1"
        actions={
          <Badge
            variant="secondary"
            className="normal-case tracking-tight text-[length:var(--fs-2xs)] font-medium sm:text-[length:var(--fs-xs)]"
          >
            {facilityLabel}
          </Badge>
        }
        className="gap-2 border-b border-border/60 pb-2 sm:gap-2 sm:pb-3"
        splitRowClassName="md:items-center"
      />
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
        "z-20 mx-0 overflow-hidden rounded-b-[var(--radius-lg)] border-x border-b border-border/50 border-t border-t-primary/20 bg-card/98 px-3 pb-2 pt-1.5 shadow-xs ring-1 ring-border/25 supports-[backdrop-filter]:backdrop-blur-md sm:mx-1 sm:px-4 sm:pb-2.5 sm:pt-2 sm:shadow-sm sm:ring-0",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-primary/[0.06] to-transparent"
      />
      <div className="relative grid min-h-9 min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <h1 className="flex min-h-9 min-w-0 items-center truncate text-left font-serif text-[length:var(--fs-lg)] font-semibold leading-none tracking-tight text-foreground">
          {clinicName}
        </h1>
        <span
          className="flex h-9 items-center justify-center tabular-nums text-[length:var(--fs-2xs)] leading-none text-muted-foreground sm:text-[length:var(--fs-xs)]"
          aria-hidden
        >
          {stepIndex + 1}/{stepCount}
        </span>
        <div className="flex min-h-9 items-center justify-end">
          <Badge
            variant="secondary"
            className="shrink-0 border-0 normal-case tracking-tight px-2 py-0 text-[length:var(--fs-2xs)] font-medium leading-none sm:text-[length:var(--fs-xs)]"
          >
            {facilityWord}
          </Badge>
        </div>
      </div>
      <Progress
        value={pct}
        className="relative mt-2 h-1 w-full overflow-hidden rounded-full sm:mt-2.5"
        aria-label={`Booking step ${stepIndex + 1} of ${stepCount}`}
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
  const hasLine =
    Boolean(selectedDoctorName) &&
    Boolean(selectedCalendarDay) &&
    Boolean(selectedStart && selectedEnd);
  const line = hasLine
    ? `${selectedDoctorName} · ${formatDate(selectedCalendarDay!, "EEE d MMM")} · ${formatTime(selectedStart!)}–${formatTime(selectedEnd!)}`
    : "Pick doctor, day, and time";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/25 px-2.5 py-2 text-left shadow-sm transition-colors duration-150 hover:bg-muted/40 sm:px-3 sm:py-2.5",
            "touch-manipulation",
          )}
          aria-label="Your request summary"
        >
          <span className="min-w-0 flex-1">
            <MicroLabel
              as="span"
              className="mt-0 block text-[length:var(--fs-2xs)] font-medium text-muted-foreground"
            >
              Summary
            </MicroLabel>
            <span className="block truncate text-[length:var(--fs-xs)] font-medium leading-snug text-foreground sm:text-[length:var(--fs-sm)]">
              {line}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground sm:size-4" aria-hidden />
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
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.firstName}
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
    <Card className={cn(bookingCardClass, bookingSectionShell, "mx-auto w-full max-w-md text-center")}>
      <CardContent className="space-y-5 px-5 py-8 sm:px-8 sm:py-10">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success/[0.12] text-success shadow-sm"
          aria-hidden
        >
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <MicroLabel as="p" className="mt-0">
            Request sent
          </MicroLabel>
          <h2 className="font-serif text-[length:var(--fs-2xl)] font-semibold tracking-tight text-foreground">
            Thank you
          </h2>
          <p className="mx-auto max-w-sm text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            The care team will reach out using the phone or WhatsApp channel they use for
            confirmations.
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-4 py-3 text-left shadow-sm">
          <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
            {facilityWord}
          </p>
          <p className="mt-1 font-medium text-[length:var(--fs-base)] text-foreground">{clinicName}</p>
          {phone ? (
            <Button variant="outline" className="mt-3 h-10 w-full rounded-[var(--radius-md)]" asChild>
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 transition-colors duration-150"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                Call clinic
              </a>
            </Button>
          ) : null}
          {address ? (
            <p className="mt-3 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              {address}
            </p>
          ) : null}
        </div>
        <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-background text-left shadow-sm [&>svg]:text-primary">
          <Mail className="h-4 w-4 shrink-0" aria-hidden />
          <AlertTitle className="text-[length:var(--fs-sm)]">What happens next</AlertTitle>
          <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
            Watch for a message or call from the clinic — timing depends on their usual confirmation
            workflow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function ContactTile({
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
      <CardHeader className={cn(bookingSectionHeaderBar, "py-4")}>
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
            <Button variant="link" asChild className="h-auto min-h-0 justify-start p-0 font-medium">
              <a
                className="break-words text-[length:var(--fs-sm)] text-foreground"
                href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
              >
                {clinic.phone}
              </a>
            </Button>
          </ContactTile>
        ) : null}
        {clinic.email ? (
          <ContactTile icon={Mail} label="Email">
            <Button variant="link" asChild className="h-auto min-h-0 justify-start p-0 font-medium">
              <a
                className="break-words text-[length:var(--fs-sm)] text-foreground"
                href={`mailto:${clinic.email}`}
              >
                {clinic.email}
              </a>
            </Button>
          </ContactTile>
        ) : null}
        {clinic.website && websiteHref ? (
          <ContactTile icon={Globe} label="Website">
            <Button variant="link" asChild className="h-auto min-h-0 justify-start p-0 font-medium">
              <a
                className="break-words text-[length:var(--fs-sm)] text-foreground"
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {clinic.website}
              </a>
            </Button>
          </ContactTile>
        ) : null}
        <ContactTile icon={Clock} label="Local time zone">
          {clinic.timezone}
        </ContactTile>
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

  return (
    <Card
      className={cn(bookingCardClass, bookingSectionShell, "flex flex-col", className)}
    >
      <CardHeader className={cn(bookingSectionHeaderBar, compact ? "py-3" : "py-4")}>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <CategoryAvatar
            icon={<CalendarIcon strokeWidth={1.5} />}
            tone={hasVisitSelection ? "success" : "neutral"}
            size={compact ? "sm" : "md"}
          />
          <div className="min-w-0 space-y-0.5">
            <MicroLabel as="h2">Your request</MicroLabel>
            <CardTitle
              className={cn(
                compact
                  ? "text-[length:var(--fs-base)]"
                  : "text-[length:var(--fs-lg)]",
              )}
            >
              {hasVisitSelection ? "Ready to review" : "Build your visit"}
            </CardTitle>
          </div>
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
          "space-y-4 sm:space-y-5",
          isCompact ? "space-y-3 py-3 sm:py-4" : "py-4 sm:py-5",
        )}
      >
        <Alert
          className={cn(
            "rounded-[var(--radius-md)] border border-border/70 bg-muted/30 shadow-sm [&>svg]:left-3.5 [&>svg]:text-primary [&>svg~*]:pl-7",
            isCompact
              ? "py-2.5 [&>svg]:top-2.5"
              : "py-3.5 [&>svg]:top-3.5",
          )}
        >
          <ShieldCheck
            className={cn("shrink-0", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
            aria-hidden
          />
          <AlertTitle
            className={cn(isCompact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]")}
          >
            Request, not a confirmed visit
          </AlertTitle>
          <AlertDescription
            className={cn(
              "leading-snug text-muted-foreground",
              isCompact
                ? "text-[length:var(--fs-2xs)]"
                : "text-[length:var(--fs-xs)] leading-relaxed",
            )}
          >
            {isCompact ? (
              <>
                Submitting is only a request — staff confirm before it is a firm
                appointment.
              </>
            ) : (
              <>
                Submitting sends a request only. The care team still confirms before it
                is a firm appointment.
              </>
            )}
          </AlertDescription>
        </Alert>
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
          Submit visit request
        </Button>
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
