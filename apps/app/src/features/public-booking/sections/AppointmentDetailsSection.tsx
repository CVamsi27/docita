"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, Calendar, MicroLabel, Separator } from "@workspace/ui/components";
import { formatDate, formatPickerIsoDate } from "@workspace/utils";
import { PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS } from "@/features/public-booking/public-booking-constants";
import { PublicBookingSectionCard } from "@/features/public-booking/public-booking-components";
import { DoctorChips, DoctorTogglePicker } from "@/features/public-booking/atoms/doctor-picker";
import { SlotGrid } from "@/features/public-booking/atoms/slot-grid";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

export function AppointmentDetailsSection({
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
  const { t } = useTranslation("PublicBooking");

  return (
    <PublicBookingSectionCard
      icon={CalendarIcon}
      micro={t("appointmentSection.micro")}
      title={t("appointmentSection.title")}
      description={t("appointmentSection.description")}
      compactHeader={compactHeader}
      contentClassName="flex min-h-0 flex-1 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 xl:gap-8"
    >
        {doctorPickerVariant === "chips" ? (
          <DoctorChips c={c} />
        ) : (
          <DoctorTogglePicker
            c={c}
            open={doctorPickerOpen}
            onToggle={() => setDoctorPickerOpen((v) => !v)}
          />
        )}

        <Separator className="my-1 bg-border/70 sm:my-2" />

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.82fr)] xl:items-stretch xl:gap-8">
          {/* Calendar column */}
          <div
            id={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.preferredDay}
            tabIndex={-1}
            className="flex flex-col gap-3 outline-none xl:h-full xl:min-h-0"
          >
            <MicroLabel as="p" className="mt-0">
              {t("appointmentSection.preferredDay")}
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
                  {t("appointmentSection.selectedPrefix")}
                </span>
                {": "}
                {c.selectedCalendarDay
                  ? formatDate(c.selectedCalendarDay, "EEE, d MMM yyyy")
                  : t("appointmentSection.tapDate")}
              </p>
              <p className="mt-1 text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                {t("appointmentSection.pickDayHint")}
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

          {/* Slots column */}
          <div
            id={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.openTimes}
            tabIndex={-1}
            className="flex min-h-0 flex-col gap-3 outline-none xl:h-full xl:min-h-0"
          >
            <MicroLabel as="p" className="mt-0 shrink-0">
              {t("appointmentSection.openTimes")}
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
              <SlotGrid
                c={c}
                doctorPickerVariant={doctorPickerVariant}
                collapseTimeRange={collapseTimeRange}
              />
            </div>
          </div>
        </div>
      </PublicBookingSectionCard>
  );
}
