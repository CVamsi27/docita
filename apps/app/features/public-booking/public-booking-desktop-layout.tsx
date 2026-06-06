"use client";

import type { ReactNode } from "react";
import {
  BookingActionPanel,
  ClinicContactCard,
  PublicBookingHeroCompact,
  RequestSummaryCard,
} from "@/features/public-booking/public-booking-components";
import {
  PublicBookingAppointmentSection,
  PublicBookingContactSection,
  PublicBookingPatientContextSection,
  PublicBookingSubmitAlerts,
  PublicBookingTurnstileSection,
} from "@/features/public-booking/public-booking-form-sections";
import { PUBLIC_BOOKING_DESKTOP_RAIL_TOP_OFFSET_CLASS } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

function StepSection({
  step,
  label,
  children,
  isLast = false,
}: {
  step: number;
  label: string;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-5 lg:gap-6">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[length:var(--fs-xs)] font-bold text-primary-foreground shadow-sm ring-4 ring-primary/10">
          {step}
        </div>
        {!isLast && (
          <div className="mt-2 w-px flex-1 bg-gradient-to-b from-border/60 to-border/10" />
        )}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-8 lg:pb-10")}>
        <p className="mb-3.5 text-[length:var(--fs-xs)] font-semibold uppercase tracking-widest text-muted-foreground">
          Step {step} · {label}
        </p>
        <div className="flex flex-col gap-4 md:gap-5">{children}</div>
      </div>
    </div>
  );
}

export function PublicBookingDesktopLayout({
  c,
  facilityWord,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
}) {
  if (!c.clinic) return null;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-7 lg:gap-8">
      <PublicBookingHeroCompact
        clinicName={c.clinic.name}
        facilityLabel={facilityWord}
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem] md:items-start lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
        {/* Left: stepped form */}
        <div className="min-w-0">
          <PublicBookingSubmitAlerts c={c} />
          <PublicBookingTurnstileSection c={c} />

          <div className="mt-2">
            <StepSection step={1} label="Doctor & schedule">
              <PublicBookingAppointmentSection
                c={c}
                doctorPickerVariant="chips"
              />
            </StepSection>
            <StepSection step={2} label="Your contact details" isLast>
              <PublicBookingContactSection c={c} facilityWord={facilityWord} />
              <PublicBookingPatientContextSection c={c} />
            </StepSection>
          </div>
        </div>
        {/* Right: sticky sidebar */}
        <aside
          className={cn(
            "flex flex-col gap-4",
            "md:sticky md:self-start",
            PUBLIC_BOOKING_DESKTOP_RAIL_TOP_OFFSET_CLASS,
          )}
        >
          <ClinicContactCard clinic={c.clinic} />
          <RequestSummaryCard
            selectedDoctorName={c.selectedDoctorName}
            selectedCalendarDay={c.selectedCalendarDay}
            selectedStart={c.selectedStart}
            selectedEnd={c.selectedEnd}
          />
          <BookingActionPanel
            submitEnabled={c.submitRequestReady}
            onSubmit={() => void c.handleSubmit()}
            isSubmitting={c.submit.isPending}
          />
        </aside>
      </div>
    </div>
  );
}
