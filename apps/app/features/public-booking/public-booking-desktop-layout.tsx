"use client";

import {
  RightRailCardStack,
} from "@workspace/ui/components/right-rail-card";
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

export function PublicBookingDesktopLayout({
  c,
  facilityWord,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
}) {
  if (!c.clinic) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-4 md:gap-5">
      <PublicBookingHeroCompact
        clinicName={c.clinic.name}
        facilityLabel={facilityWord}
      />

      <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] md:gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] md:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 md:gap-5">
          <PublicBookingSubmitAlerts c={c} />
          <PublicBookingTurnstileSection c={c} />
          <PublicBookingAppointmentSection c={c} />
          <PublicBookingContactSection c={c} facilityWord={facilityWord} />
          <PublicBookingPatientContextSection c={c} />
        </div>

        <aside
          className={cn(
            "flex flex-col gap-3 md:sticky md:self-start md:gap-4",
            PUBLIC_BOOKING_DESKTOP_RAIL_TOP_OFFSET_CLASS,
          )}
        >
          <RightRailCardStack ariaLabel="Location and visit summary">
            <ClinicContactCard clinic={c.clinic} />
            <RequestSummaryCard
              selectedDoctorName={c.selectedDoctorName}
              selectedCalendarDay={c.selectedCalendarDay}
              selectedStart={c.selectedStart}
              selectedEnd={c.selectedEnd}
            />
          </RightRailCardStack>
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
