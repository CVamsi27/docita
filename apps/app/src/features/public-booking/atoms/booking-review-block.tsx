"use client";

import { useTranslation } from "react-i18next";
import { Button, MicroLabel } from "@workspace/ui/components";
import { formatDate, getPatientFullName } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";
import { PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS, type PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { bookingCardClass, bookingSectionHeaderBar, bookingSectionShell } from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";

function ReviewRow({
  label,
  value,
  editStep,
  fieldId,
  onEdit,
}: {
  label: string;
  value: string;
  editStep: PublicBookingMobileStep;
  fieldId?: string;
  onEdit: (step: PublicBookingMobileStep, fieldId?: string) => void;
}) {
  const { t } = useTranslation("PublicBooking");

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
        {t("reviewBlock.edit")}
      </Button>
    </div>
  );
}

export function PublicBookingReviewBlock({
  c,
  onEdit,
}: {
  c: PublicBookingPageController;
  onEdit: (step: PublicBookingMobileStep, fieldId?: string) => void;
}) {
  const { t } = useTranslation("PublicBooking");
  const patient =
    c.firstName.trim() || c.lastName.trim() ? getPatientFullName(c) : "—";

  const dayLabel = c.selectedCalendarDay
    ? formatDate(c.selectedCalendarDay, "EEE, d MMM yyyy")
    : "—";

  const timeLabel =
    c.selectedStart && c.selectedEnd
      ? `${formatTime(c.selectedStart)} – ${formatTime(c.selectedEnd)}`
      : t("reviewBlock.dateOnly");

  const doctorLabel = c.selectedDoctorName ?? "—";

  const rows: Array<{
    id: string;
    label: string;
    value: string;
    editStep: PublicBookingMobileStep;
    fieldId?: string;
  }> = [
    {
      id: "doctor",
      label: t("reviewBlock.rows.doctor"),
      value: doctorLabel,
      editStep: "visit",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.doctor,
    },
    {
      id: "day",
      label: t("reviewBlock.rows.day"),
      value: dayLabel,
      editStep: "visit",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.preferredDay,
    },
    {
      id: "time",
      label: t("reviewBlock.rows.time"),
      value: timeLabel,
      editStep: "visit",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.openTimes,
    },
    {
      id: "patient",
      label: t("reviewBlock.rows.patient"),
      value: patient,
      editStep: "contact",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone,
    },
    {
      id: "phone",
      label: t("reviewBlock.rows.phone"),
      value: c.phone.trim() || "—",
      editStep: "contact",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone,
    },
    {
      id: "reason",
      label: t("reviewBlock.rows.reasonForVisit"),
      value: c.reason.trim() || "—",
      editStep: "contact",
      fieldId: PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.reason,
    },
  ];

  return (
    <div
      className={cn(
        bookingSectionShell,
        bookingCardClass,
        "flex flex-col bg-card",
      )}
    >
      <div className={cn(bookingSectionHeaderBar, "px-4 py-3 sm:px-5 sm:py-4")}>
        <MicroLabel as="h2" className="mt-0">
          {t("reviewBlock.review")}
        </MicroLabel>
        <p className="mt-1 font-serif text-[length:var(--fs-xl)] font-semibold tracking-tight text-foreground">
          {t("reviewBlock.confirmTitle")}
        </p>
        <p className="mt-1 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
          {t("reviewBlock.description")}
        </p>
      </div>
      <div className="px-4 pb-4 pt-0 sm:px-5">
        {rows.map((row) => (
          <ReviewRow key={row.id} {...row} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
