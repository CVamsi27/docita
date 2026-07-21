"use client";

import {
  Button,
  MicroLabel
} from "@workspace/ui/components";
import { formatDate, getPatientFullName } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";
import {
  PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS,
  type PublicBookingMobileStep,
} from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import {
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "./booking-constants";
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

export function PublicBookingReviewBlock({
  c,
  onEdit,
}: {
  c: PublicBookingPageController;
  onEdit: (step: PublicBookingMobileStep, fieldId?: string) => void;
}) {
  const patient =
    c.firstName.trim() || c.lastName.trim() ? getPatientFullName(c) : "—";

  const dayLabel = c.selectedCalendarDay
    ? formatDate(c.selectedCalendarDay, "EEE, d MMM yyyy")
    : "—";

  const timeLabel =
    c.selectedStart && c.selectedEnd
      ? `${formatTime(c.selectedStart)} – ${formatTime(c.selectedEnd)}`
      : "Date only (no slot)";

  const doctorLabel = c.selectedDoctorName ?? "—";

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
          Review
        </MicroLabel>
        <p className="mt-1 font-serif text-[length:var(--fs-xl)] font-semibold tracking-tight text-foreground">
          Confirm before you send
        </p>
        <p className="mt-1 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
          Submitting sends a request only — the clinic confirms before your
          visit is final.
        </p>
      </div>
      <div className="px-4 pb-4 pt-0 sm:px-5">
        <ReviewRow
          label="Doctor"
          value={doctorLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.doctor}
          onEdit={onEdit}
        />
        <ReviewRow
          label="Day"
          value={dayLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.preferredDay}
          onEdit={onEdit}
        />
        <ReviewRow
          label="Time"
          value={timeLabel}
          editStep="visit"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.openTimes}
          onEdit={onEdit}
        />
        <ReviewRow
          label="Patient"
          value={patient}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone}
          onEdit={onEdit}
        />
        <ReviewRow
          label="Phone"
          value={c.phone.trim() || "—"}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.phone}
          onEdit={onEdit}
        />
        <ReviewRow
          label="Reason for visit"
          value={c.reason.trim() || "—"}
          editStep="contact"
          fieldId={PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS.reason}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}
