"use client";

import {
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import {
  DPDP_NOTICE_TEXT_PATIENT,
  DPDP_NOTICE_TITLE,
} from "@workspace/types";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { CategoryAvatar } from "@workspace/ui/components/category-avatar";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { DataState } from "@workspace/ui/components/data-state";
import { DescriptionList } from "@workspace/ui/components/description-list";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";
import { Label } from "@workspace/ui/components/label";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { Timeline } from "@workspace/ui/components/timeline";
import { formatDate, formatPickerIsoDate } from "@workspace/utils";
import { TurnstileWidget } from "@/features/public-booking/components/turnstile-widget";
import {
  ANY_DOCTOR_ID,
  PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS,
} from "@/features/public-booking/public-booking-constants";
import {
  appointmentTimelineAccent,
  BookingSectionHeader,
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
  formatAppointmentStatus,
  publicBookingSlotEmptyMessage,
  SlotTimesScrollArea,
  SlotTimesSkeletonGrid,
} from "@/features/public-booking/public-booking-components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatDateTime, formatTime } from "@/lib/formatters";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingSubmitAlerts({
  c,
}: {
  c: PublicBookingPageController;
}) {
  return (
    <>
      {c.submitGeneralMessage ? (
        <Alert
          variant="destructive"
          className="rounded-[var(--radius-md)] border text-left [&>svg]:top-3.5"
        >
          <AlertTitle className="text-[length:var(--fs-sm)]">
            Unable to send your request
          </AlertTitle>
          <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed">
            {c.submitGeneralMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      {c.unknownSubmitErrors.length > 0 ? (
        <Alert
          variant="destructive"
          className="rounded-[var(--radius-md)] border text-left [&>svg]:top-3.5"
        >
          <AlertTitle className="text-[length:var(--fs-sm)]">
            Check these issues
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[length:var(--fs-xs)] leading-relaxed">
              {c.unknownSubmitErrors.map(([fieldKey, msg]) => (
                <li key={fieldKey || "issue"}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

export function PublicBookingTurnstileSection({
  c,
  compactHeader = false,
  layout = "card",
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
  layout?: "card" | "inline";
}) {
  if (!c.siteKey) return null;

  const widget = (
    <>
      <TurnstileWidget
        siteKey={c.siteKey}
        onToken={(t) => {
          c.setTurnstileToken(t);
          c.setSubmitFieldErrors((prev) => {
            const next = { ...prev };
            delete next.turnstileToken;
            return next;
          });
        }}
        onExpire={() => {
          c.setTurnstileToken(null);
          c.setSubmitFieldErrors((prev) => {
            const next = { ...prev };
            delete next.turnstileToken;
            return next;
          });
        }}
        className="flex w-full justify-center [&_iframe]:max-w-full"
      />
      {c.submitFieldErrors.turnstileToken ? (
        <Alert
          variant="destructive"
          className={cn(
            "rounded-[var(--radius-md)] text-left [&>svg]:top-3.5",
            layout === "inline" ? "mt-3" : "mt-4",
          )}
        >
          <AlertDescription className="text-[length:var(--fs-xs)] leading-snug">
            {c.submitFieldErrors.turnstileToken}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );

  if (layout === "inline") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border/60 bg-card px-4 py-4 shadow-sm">
        <div className="flex gap-3">
          <CategoryAvatar
            icon={<Lock strokeWidth={1.5} />}
            tone="neutral"
            size="md"
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <MicroLabel as="p" className="mt-0">
              Before you continue
            </MicroLabel>
            <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              <span aria-hidden className="font-semibold text-destructive">
                *{" "}
              </span>
              Quick verification protects this page from automated abuse.
            </p>
            {widget}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(bookingCardClass, bookingSectionShell, "flex flex-col")}>
      <CardHeader
        className={cn(bookingSectionHeaderBar, compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5")}
      >
        <BookingSectionHeader
          icon={Lock}
          micro="Before you continue"
          title="Quick verification"
          description={
            <>
              <span aria-hidden className="font-semibold text-destructive">
                *{" "}
              </span>
              This protects the page from automated abuse. Your visit details stay
              private.
            </>
          }
          tone="neutral"
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="bg-muted/25 px-4 py-5 sm:px-6">{widget}</CardContent>
    </Card>
  );
}

function DoctorChips({
  c,
}: {
  c: PublicBookingPageController;
}) {
  const doctors = c.doctorsQuery.data?.doctors ?? [];
  const activeId = c.doctorId;

  function selectDoctor(id: string) {
    c.setDoctorId(id);
    c.clearSlotSelection();
    c.setSubmitFieldErrors((prev) => {
      const next = { ...prev };
      delete next.preferredDoctorId;
      return next;
    });
  }

  return (
    <div className="grid gap-2">
      <Label className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground">
        Doctor
        <span className="ml-1 font-normal text-muted-foreground/70">(optional)</span>
      </Label>
      {c.doctorsQuery.isLoading ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {doctors.length > 1 ? (
            <button
              type="button"
              onClick={() => selectDoctor(ANY_DOCTOR_ID)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[length:var(--fs-xs)] font-medium transition-colors duration-150 touch-manipulation",
                !activeId || activeId === ANY_DOCTOR_ID
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
            >
              Any doctor
            </button>
          ) : null}
          {doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDoctor(d.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[length:var(--fs-xs)] font-medium transition-colors duration-150 touch-manipulation",
                activeId === d.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/35 hover:bg-muted/20 hover:text-foreground",
              )}
            >
              {d.name ?? "Doctor"}
              {d.specialization ? (
                <span className="ml-1 opacity-70">· {d.specialization}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      {c.submitFieldErrors.preferredDoctorId ? (
        <p role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
          {c.submitFieldErrors.preferredDoctorId}
        </p>
      ) : null}
      {c.doctorsQuery.isError ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void c.doctorsQuery.refetch()}
        >
          Retry loading doctors
        </Button>
      ) : null}
    </div>
  );
}

export function PublicBookingAppointmentSection({
  c,
  compactHeader = false,
  collapseTimeRange = false,
  doctorPickerVariant = "toggle",
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
  /** When true, time-of-day filters render inside a collapsed-by-default `details` (mobile). */
  collapseTimeRange?: boolean;
  /** "chips": always-visible horizontal chip row; "toggle": existing show/hide select (default). */
  doctorPickerVariant?: "chips" | "toggle";
}) {
  const [doctorPickerOpen, setDoctorPickerOpen] = useState(false);

  return (
    <Card className={cn(bookingCardClass, bookingSectionShell, "flex flex-col")}>
      <CardHeader
        className={cn(bookingSectionHeaderBar, compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5")}
      >
        <BookingSectionHeader
          icon={CalendarIcon}
          micro="Appointment"
          title="Doctor, date, and time"
          description="Select who you would like to see, pick a day, then tap an open slot that works for you."
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 xl:gap-8">
        {doctorPickerVariant === "chips" ? (
          <DoctorChips c={c} />
        ) : (
          <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground">
              Doctor (optional)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-[var(--radius-md)]"
              onClick={() => setDoctorPickerOpen((v) => !v)}
              aria-expanded={doctorPickerOpen}
              aria-controls="pb-doctor-picker"
            >
              {doctorPickerOpen ? "Hide doctor" : "Select doctor"}
            </Button>
          </div>

          {doctorPickerOpen ? (
            <div id="pb-doctor-picker" className="grid gap-2">
              <Select
                value={c.doctorId}
                onValueChange={(v) => {
                  c.setDoctorId(v);
                  c.clearSlotSelection();
                  c.setSubmitFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.preferredDoctorId;
                    return next;
                  });
                }}
              >
                <SelectTrigger
                  id="pb-doctor-select"
                  className={cn(
                    "h-11 w-full rounded-[var(--radius-md)] border-border/70 bg-background text-[length:var(--fs-sm)] shadow-sm sm:h-11",
                    c.submitFieldErrors.preferredDoctorId &&
                      "border-destructive",
                  )}
                  aria-label="Doctor"
                  aria-invalid={
                    c.submitFieldErrors.preferredDoctorId ? true : undefined
                  }
                  aria-describedby={
                    c.submitFieldErrors.preferredDoctorId
                      ? "pb-doctor-select-error"
                      : undefined
                  }
                  disabled={c.doctorsQuery.isLoading}
                >
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {(c.doctorsQuery.data?.doctors ?? []).length > 1 ? (
                    <SelectItem value={ANY_DOCTOR_ID}>
                      Any available doctor
                    </SelectItem>
                  ) : null}
                  {(c.doctorsQuery.data?.doctors ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name ?? "Doctor"}
                      {d.specialization ? ` - ${d.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {c.submitFieldErrors.preferredDoctorId ? (
                <p
                  id="pb-doctor-select-error"
                  role="alert"
                  className="text-[length:var(--fs-xs)] leading-snug text-destructive"
                >
                  {c.submitFieldErrors.preferredDoctorId}
                </p>
              ) : null}
            </div>
          ) : null}

          {!doctorPickerOpen && c.doctorId ? (
            <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">
                {c.selectedDoctorName ?? "Doctor"}
              </span>
            </p>
          ) : null}

          {c.doctorsQuery.isError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void c.doctorsQuery.refetch()}
            >
              Retry loading doctors
            </Button>
          ) : null}
        </div>
        )}

        <Separator className="my-1 bg-border/70 sm:my-2" />

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.82fr)] xl:items-stretch xl:gap-8">
          <div
            id={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.preferredDay}
            tabIndex={-1}
            className="flex flex-col gap-3 outline-none xl:h-full xl:min-h-0"
          >
            <MicroLabel as="p" className="mt-0">
              Preferred day
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            </MicroLabel>
            <div
              className={cn(
                "overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-background p-2.5 shadow-sm ring-1 ring-border/40 sm:p-3.5",
                c.submitFieldErrors.slotCalendarDate &&
                  "border-destructive ring-2 ring-destructive/25",
              )}
            >
              <Calendar
                mode="single"
                required
                month={c.calendarMonth}
                onMonthChange={c.setCalendarMonth}
                selected={c.selectedCalendarDay}
                onSelect={(d) => {
                  if (d) {
                    c.setSlotDate(formatPickerIsoDate(d));
                    c.clearSlotSelection();
                    c.setSubmitFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.slotCalendarDate;
                      delete next.requestedSlotStart;
                      delete next.requestedSlotEnd;
                      return next;
                    });
                  }
                }}
                captionLayout="dropdown"
                className="w-full max-w-full bg-transparent p-0 [--cell-size:2.35rem] md:[--cell-size:2.25rem] [&_[data-day]]:!size-auto [&_[data-day]]:!min-h-0 [&_[data-day]]:!min-w-0 [&_[data-day]]:!h-full [&_[data-day]]:!w-full [&_table]:w-full [&_td]:p-1 [&_[data-day]]:touch-manipulation"
                classNames={{ root: "w-full max-w-full" }}
              />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-2.5 shadow-sm sm:px-3.5 sm:py-3">
              <p className="text-[length:var(--fs-sm)] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">
                  Selected
                </span>
                {": "}
                {c.selectedCalendarDay
                  ? formatDate(
                      c.selectedCalendarDay,
                      "EEE, d MMM yyyy",
                    )
                  : "Tap a date on the calendar"}
              </p>
              <p className="mt-1 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                Pick a day now. The clinic will confirm the exact
                time after approval.
              </p>
              {c.submitFieldErrors.slotCalendarDate ? (
                <p
                  role="alert"
                  className="mt-2 text-[length:var(--fs-xs)] leading-snug text-destructive"
                >
                  {c.submitFieldErrors.slotCalendarDate}
                </p>
              ) : null}
            </div>
          </div>

          <div
            id={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.openTimes}
            tabIndex={-1}
            className="flex min-h-0 flex-col gap-3 outline-none xl:h-full xl:min-h-0"
          >
            <MicroLabel as="p" className="mt-0 shrink-0">
              Open times that day
            </MicroLabel>
            {c.slotRangeSubmitError ? (
              <Alert
                variant="destructive"
                className="shrink-0 rounded-[var(--radius-md)] text-left [&>svg]:top-3.5"
              >
                <AlertDescription className="text-[length:var(--fs-xs)] leading-snug">
                  {c.slotRangeSubmitError}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col">
              {!c.doctorId ? (
                <EmptyState
                  icon={UserCircle}
                  title={doctorPickerVariant === "chips" ? "Select a doctor above" : "Doctor selection is optional"}
                  description={
                    doctorPickerVariant === "chips"
                      ? "Tap a doctor to see open times for the day you picked, or tap 'Any doctor' to see all available slots."
                      : "If you choose a doctor, you can pick an exact time. Otherwise, you can request a date only and the clinic will assign a doctor and time."
                  }
                  className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                />
              ) : c.slotsQuery.isLoading ? (
                <SlotTimesSkeletonGrid />
              ) : c.slotsQuery.isError ? (
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
                    onClick={() => void c.slotsQuery.refetch()}
                  >
                    Retry loading times
                  </Button>
                </div>
              ) : c.allSlots.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title="No times this day"
                  description={publicBookingSlotEmptyMessage(
                    c.slotsQuery.data?.slotListEmptyReason,
                  )}
                  className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                />
              ) : c.availableSlots.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <EmptyState
                    icon={Clock}
                    title="No openings left"
                    description="There are no free times left on this date. The times below are already booked, blocked, or earlier in the day. Choose another date if you need an opening."
                    className="shrink-0 rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-5 shadow-sm sm:py-6 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                  />
                  <SlotTimesScrollArea enabled={c.allSlots.length > 6}>
                    <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      {c.allSlots.map((s) => (
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
                  enabled={c.filteredAvailableSlots.length > 6}
                >
                  {collapseTimeRange ? (
                    <details className="mb-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 open:border-border/70 open:shadow-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[length:var(--fs-sm)] font-medium text-foreground transition-colors duration-150 hover:bg-muted/15 [&::-webkit-details-marker]:hidden">
                        <span>Filter by time of day</span>
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150"
                          aria-hidden
                        />
                      </summary>
                      <div className="border-t border-border/40 px-3 pb-3 pt-2">
                        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                          <div className="grid gap-2">
                            <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
                              Time range (from)
                            </Label>
                            <Select
                              value={c.timeRangeStart || "__none__"}
                              onValueChange={(v) => {
                                const val = v === "__none__" ? "" : v;
                                c.setTimeRangeStart(val);
                                if (c.timeRangeEnd) {
                                  const s = new Date(val).getTime();
                                  const e = new Date(c.timeRangeEnd).getTime();
                                  if (
                                    Number.isFinite(s) &&
                                    Number.isFinite(e) &&
                                    e <= s
                                  ) {
                                    c.setTimeRangeEnd("");
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                                <SelectValue placeholder="Any time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Any time</SelectItem>
                                {c.timeRangeOptions.starts.map((t) => (
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
                              value={c.timeRangeEnd || "__none__"}
                              onValueChange={(v) => c.setTimeRangeEnd(v === "__none__" ? "" : v)}
                            >
                              <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                                <SelectValue placeholder="Any time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Any time</SelectItem>
                                {c.timeRangeOptions.ends.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {formatTime(t)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </details>
                  ) : (
                    <div className="mb-3 grid gap-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 p-3 shadow-sm sm:grid-cols-2 sm:items-end sm:p-4">
                      <div className="grid gap-2">
                        <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
                          Time range (from)
                        </Label>
                        <Select
                          value={c.timeRangeStart}
                          onValueChange={(v) => {
                            c.setTimeRangeStart(v);
                            if (c.timeRangeEnd) {
                              const s = new Date(v).getTime();
                              const e = new Date(c.timeRangeEnd).getTime();
                              if (
                                Number.isFinite(s) &&
                                Number.isFinite(e) &&
                                e <= s
                              ) {
                                c.setTimeRangeEnd("");
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                            <SelectValue placeholder="Any time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any time</SelectItem>
                            {c.timeRangeOptions.starts.map((t) => (
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
                          value={c.timeRangeEnd}
                          onValueChange={c.setTimeRangeEnd}
                        >
                          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
                            <SelectValue placeholder="Any time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any time</SelectItem>
                            {c.timeRangeOptions.ends.map((t) => (
                              <SelectItem key={t} value={t}>
                                {formatTime(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {c.filteredAvailableSlots.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="No openings in this time range"
                      description="Try a wider window or clear the time range to see all openings for this day."
                      className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-border/60 bg-muted/10 px-3 py-6 shadow-sm sm:py-8 xl:min-h-0 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                    />
                  ) : (
                    <ul className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      {c.filteredAvailableSlots.map((s) => {
                        const selected =
                          c.selectedStart === s.startTime &&
                          (c.doctorId !== ANY_DOCTOR_ID ||
                            c.selectedSlotDoctorId === s.doctorId);
                        return (
                          <li
                            key={`${s.startTime}-${s.endTime}-${s.doctorId}`}
                            className="min-w-0"
                          >
                            <Button
                              type="button"
                              variant={selected ? "default" : "outline"}
                              className={cn(
                                "h-auto min-h-[3.25rem] max-md:min-h-[3.5rem] w-full min-w-0 justify-start rounded-[var(--radius-md)] px-4 py-3 text-left outline-none ring-offset-background transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                                selected
                                  ? "shadow-md ring-2 ring-primary/45 ring-offset-2 ring-offset-background border border-primary/40"
                                  : "touch-manipulation border-border/70 shadow-sm hover:border-primary/35 hover:bg-muted/25 hover:shadow-md",
                              )}
                              onClick={() =>
                                c.doctorId === ANY_DOCTOR_ID
                                  ? c.handleSelectSlotWithDoctor(
                                      s.startTime,
                                      s.endTime,
                                      s.doctorId,
                                    )
                                  : c.handleSelectSlot(
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
  );
}

export function PublicBookingContactSection({
  c,
  facilityWord,
  compactHeader = false,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
  compactHeader?: boolean;
}) {
  const requiredMark = (
    <span aria-hidden className="text-destructive">
      {" "}
      *
    </span>
  );

  const phoneChecked = c.requiresOtp !== null;
  const isNewPatient = c.requiresOtp === false;

  return (
    <Card className={cn(bookingCardClass, bookingSectionShell, "flex flex-col")}>
      <CardHeader
        className={cn(bookingSectionHeaderBar, compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5")}
      >
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
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 sm:px-6 sm:py-6">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pb-phone" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
            Phone number{requiredMark}
          </Label>
          <Input
            id="pb-phone"
            value={c.phone}
            onChange={(e) => {
              c.setPhone(e.target.value);
              c.setRequiresOtp(null);
              c.setVerificationToken(null);
              c.setDateOfBirth("");
              c.setFirstName("");
              c.setLastName("");
              c.setEmail("");
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.phoneNumber;
                delete next.bookingVerificationToken;
                return next;
              });
            }}
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={c.submitFieldErrors.phoneNumber ? true : undefined}
            aria-describedby={c.submitFieldErrors.phoneNumber ? "pb-phone-error" : undefined}
          />
          {c.submitFieldErrors.phoneNumber ? (
            <p id="pb-phone-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
              {c.submitFieldErrors.phoneNumber}
            </p>
          ) : null}
          {!phoneChecked ? (
            <Button
              type="button"
              className="mt-2 h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold"
              onClick={() => void c.runPhoneCheck()}
              disabled={!c.phone.trim() || c.phoneCheck.isPending}
            >
              Continue
            </Button>
          ) : null}
        </div>

        <div className="space-y-3 sm:col-span-2">
          {c.requiresOtp === false ? (
            <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-muted/25 text-left shadow-sm">
              <AlertTitle className="text-[length:var(--fs-sm)]">
                New to booking here online
              </AlertTitle>
              <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                We did not find an existing chart for this phone number at this location yet.
                Submit your request and staff will confirm your visit.
              </AlertDescription>
            </Alert>
          ) : null}

          {c.requiresOtp ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-primary/35 bg-gradient-to-br from-primary/[0.07] to-card p-4 shadow-sm">
              <div className="space-y-1">
                <MicroLabel as="p" className="mt-0">
                  Verify your phone
                </MicroLabel>
                <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  This phone matches records at this location. Request a one-time code via WhatsApp,
                  then enter it so we can show your recent visits.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 justify-start px-2 text-[length:var(--fs-xs)] text-muted-foreground"
                  onClick={() => {
                    c.setRequiresOtp(false);
                    c.setVerificationToken(null);
                    c.setOtp("");
                    c.setSubmitFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.bookingVerificationToken;
                      return next;
                    });
                  }}
                >
                  New patient / can’t receive WhatsApp? Continue without code
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-[var(--radius-md)] border-primary/35 bg-background/95 shadow-sm transition-colors duration-150 hover:border-primary/50 hover:bg-background sm:h-11"
                onClick={() => void c.handleRequestOtp()}
                disabled={c.otpRequest.isPending}
              >
                Send code to WhatsApp
              </Button>
              <div className="grid gap-2">
                <Label htmlFor="pb-otp" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
                  Verification code{requiredMark}
                </Label>
                <Input
                  id="pb-otp"
                  value={c.otp}
                  onChange={(e) => {
                    c.setOtp(e.target.value);
                    c.setSubmitFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.bookingVerificationToken;
                      return next;
                    });
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-invalid={c.submitFieldErrors.bookingVerificationToken ? true : undefined}
                  aria-describedby={c.submitFieldErrors.bookingVerificationToken ? "pb-otp-error" : undefined}
                />
                {c.submitFieldErrors.bookingVerificationToken ? (
                  <p id="pb-otp-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
                    {c.submitFieldErrors.bookingVerificationToken}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                className="h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold sm:h-11"
                onClick={() => void c.handleVerifyOtp()}
                disabled={c.otpVerify.isPending || c.otp.length < 4}
              >
                Verify and continue
              </Button>
            </div>
          ) : null}
        </div>

        {isNewPatient ? (
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
          </>
        ) : null}

        {isNewPatient ? (
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
        ) : null}

        {isNewPatient ? (
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
                I have read this notice and consent to my personal and health
                data being processed as described.
              </span>
            </label>
          </div>
        ) : null}

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pb-reason" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
            Reason for visit
          </Label>
          <Input
            id="pb-reason"
            value={c.reason}
            onChange={(e) => {
              c.setReason(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.reason;
                return next;
              });
            }}
            aria-invalid={c.submitFieldErrors.reason ? true : undefined}
            aria-describedby={c.submitFieldErrors.reason ? "pb-reason-error" : undefined}
          />
          {c.submitFieldErrors.reason ? (
            <p id="pb-reason-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
              {c.submitFieldErrors.reason}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label
            htmlFor="pb-notes"
            className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground"
          >
            Notes for the team
          </Label>
          <Textarea
            id="pb-notes"
            value={c.notes}
            onChange={(e) => {
              c.setNotes(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.notes;
                return next;
              });
            }}
            placeholder="Enter notes for the team"
            maxLength={1000}
            aria-invalid={c.submitFieldErrors.notes ? true : undefined}
            aria-describedby={
              c.submitFieldErrors.notes ? "pb-notes-error" : undefined
            }
            className={cn(
              "min-h-[96px] rounded-[var(--radius-md)] border-border/80 bg-background text-[length:var(--fs-sm)] shadow-sm",
              c.submitFieldErrors.notes && "border-destructive",
            )}
          />
          {c.submitFieldErrors.notes ? (
            <p
              id="pb-notes-error"
              role="alert"
              className="text-[length:var(--fs-xs)] leading-snug text-destructive"
            >
              {c.submitFieldErrors.notes}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicBookingPatientContextSection({
  c,
  compactHeader = false,
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
}) {
  if (!c.verificationToken || !c.clinic) return null;
  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col transition-colors duration-150",
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          compactHeader ? "pb-3 pt-4 sm:pb-4 sm:pt-5" : "pb-4 pt-5 sm:pb-6 sm:pt-6",
        )}
      >
        <BookingSectionHeader
          icon={Sparkles}
          micro="Your history here"
          title="Recent visits at this location"
          description={
            <>
              A short summary from your chart at {c.clinic.name} so you
              can book with context.
            </>
          }
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="bg-background px-4 pt-5 sm:px-6 sm:pt-6">
        <DataState
          status={
            c.contextQuery.isLoading
              ? "loading"
              : c.contextQuery.isError
                ? "error"
                : "success"
          }
          loadingMessage="Loading your visit summary…"
          errorMessage="We could not load your visit summary."
          onRetry={() => void c.contextQuery.refetch()}
        >
          {c.contextQuery.data ? (
            <div className="space-y-5">
              {c.contextQuery.data.patientSince ? (
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
                          new Date(c.contextQuery.data.patientSince),
                          "d MMMM yyyy",
                        ),
                      },
                    ]}
                  />
                </div>
              ) : null}
              {c.contextQuery.data.appointments.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title="No prior visits on file"
                  description="You are all set to request a new time at this location."
                  className="rounded-[var(--radius-md)] border border-dashed border-border/60 bg-background/80 px-3 py-6 sm:py-7 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                />
              ) : (
                <div className="space-y-3">
                  <MicroLabel as="p" className="mt-0">
                    Recent visits
                  </MicroLabel>
                  <Timeline
                    className="space-y-3"
                    items={c.contextQuery.data.appointments.map(
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
  );
}

