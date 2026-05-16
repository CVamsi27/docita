"use client";

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
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
import { formatDate, formatPickerIsoDate } from "@workspace/utils";
import {
  ANY_DOCTOR_ID,
  PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS,
} from "@/features/public-booking/public-booking-constants";
import {
  BookingSectionHeader,
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
  publicBookingSlotEmptyMessage,
  SlotTimesScrollArea,
  SlotTimesSkeletonGrid,
} from "@/features/public-booking/public-booking-components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatTime } from "@/lib/formatters";
import { cn } from "@workspace/ui/lib/utils";

function DoctorChips({ c }: { c: PublicBookingPageController }) {
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

export function AppointmentDetailsSection({
  c,
  compactHeader = false,
  collapseTimeRange = false,
  doctorPickerVariant = "toggle",
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
  collapseTimeRange?: boolean;
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
                      c.submitFieldErrors.preferredDoctorId && "border-destructive",
                    )}
                    aria-label="Doctor"
                    aria-invalid={c.submitFieldErrors.preferredDoctorId ? true : undefined}
                    aria-describedby={
                      c.submitFieldErrors.preferredDoctorId ? "pb-doctor-select-error" : undefined
                    }
                    disabled={c.doctorsQuery.isLoading}
                  >
                    <SelectValue placeholder="Select a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(c.doctorsQuery.data?.doctors ?? []).length > 1 ? (
                      <SelectItem value={ANY_DOCTOR_ID}>Any available doctor</SelectItem>
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
              <span aria-hidden className="text-destructive"> *</span>
            </MicroLabel>
            <div
              className={cn(
                "overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-background p-2.5 shadow-sm ring-1 ring-border/40 sm:p-3.5",
                c.submitFieldErrors.slotCalendarDate && "border-destructive ring-2 ring-destructive/25",
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
                <span className="font-medium text-foreground">Selected</span>
                {": "}
                {c.selectedCalendarDay
                  ? formatDate(c.selectedCalendarDay, "EEE, d MMM yyyy")
                  : "Tap a date on the calendar"}
              </p>
              <p className="mt-1 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                Pick a day now. The clinic will confirm the exact time after approval.
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
                      Open times could not be loaded. Check your connection and try again.
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
                  description={publicBookingSlotEmptyMessage(c.slotsQuery.data?.slotListEmptyReason)}
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
                        <li key={`${s.startTime}-${s.endTime}-${s.doctorId}`} className="min-w-0">
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
                                <span aria-hidden className="font-normal text-muted-foreground/80">-</span>{" "}
                                {formatTime(s.endTime)}
                              </span>
                              <span className="truncate text-[length:var(--fs-xs)] text-muted-foreground">
                                Unavailable{s.doctorName ? ` — ${s.doctorName}` : ""}
                              </span>
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </SlotTimesScrollArea>
                </div>
              ) : (
                <SlotTimesScrollArea enabled={c.filteredAvailableSlots.length > 6}>
                  {collapseTimeRange ? (
                    <details className="mb-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 open:border-border/70 open:shadow-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[length:var(--fs-sm)] font-medium text-foreground transition-colors duration-150 hover:bg-muted/15 [&::-webkit-details-marker]:hidden">
                        <span>Filter by time of day</span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-150" aria-hidden />
                      </summary>
                      <div className="border-t border-border/40 px-3 pb-3 pt-2">
                        <TimeRangeFilters c={c} useNoneValue />
                      </div>
                    </details>
                  ) : (
                    <div className="mb-3 grid gap-3 rounded-[var(--radius-md)] border border-border/50 bg-surface-2 p-3 shadow-sm sm:grid-cols-2 sm:items-end sm:p-4">
                      <TimeRangeFilters c={c} useNoneValue={false} />
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
                          (c.doctorId !== ANY_DOCTOR_ID || c.selectedSlotDoctorId === s.doctorId);
                        return (
                          <li key={`${s.startTime}-${s.endTime}-${s.doctorId}`} className="min-w-0">
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
                                  ? c.handleSelectSlotWithDoctor(s.startTime, s.endTime, s.doctorId)
                                  : c.handleSelectSlot(s.startTime, s.endTime)
                              }
                            >
                              <span className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                                <span
                                  className={cn(
                                    "text-[length:var(--fs-sm)] font-medium tracking-tight",
                                    selected && "text-primary-foreground",
                                  )}
                                >
                                  {formatTime(s.startTime)}{" "}
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "font-normal",
                                      selected ? "text-primary-foreground/85" : "text-muted-foreground/90",
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
                                      selected ? "text-primary-foreground/90" : "text-muted-foreground",
                                    )}
                                  >
                                    {s.doctorName}
                                    {s.specialization ? ` - ${s.specialization}` : ""}
                                  </span>
                                ) : null}
                              </span>
                              {selected ? (
                                <CheckCircle2 className="ml-3 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-foreground" aria-hidden />
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

function TimeRangeFilters({
  c,
  useNoneValue,
}: {
  c: PublicBookingPageController;
  useNoneValue: boolean;
}) {
  const noneVal = useNoneValue ? "__none__" : "";

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
          Time range (from)
        </Label>
        <Select
          value={useNoneValue ? (c.timeRangeStart || noneVal) : c.timeRangeStart}
          onValueChange={(v) => {
            const val = useNoneValue && v === "__none__" ? "" : v;
            c.setTimeRangeStart(val);
            if (c.timeRangeEnd) {
              const s = new Date(val).getTime();
              const e = new Date(c.timeRangeEnd).getTime();
              if (Number.isFinite(s) && Number.isFinite(e) && e <= s) {
                c.setTimeRangeEnd("");
              }
            }
          }}
        >
          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={noneVal}>Any time</SelectItem>
            {c.timeRangeOptions.starts.map((t) => (
              <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label className="text-[length:var(--fs-xs)] font-normal text-muted-foreground">
          Time range (to)
        </Label>
        <Select
          value={useNoneValue ? (c.timeRangeEnd || noneVal) : c.timeRangeEnd}
          onValueChange={(v) => c.setTimeRangeEnd(useNoneValue && v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-11 rounded-[var(--radius-md)] border-border/70 bg-background shadow-sm">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={noneVal}>Any time</SelectItem>
            {c.timeRangeOptions.ends.map((t) => (
              <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
