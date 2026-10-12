"use client";

import { type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button, MicroLabel } from "@workspace/ui/components";
import {
  PublicBookingHowItWorksSheet,
  PublicBookingReviewBlock,
  PublicBookingSummaryPeek,
} from "@/features/public-booking/public-booking-components";
import {
  PUBLIC_BOOKING_STEP_HEADING_SCROLL_MARGIN_CLASS,
  type PublicBookingMobileStep,
} from "@/features/public-booking/public-booking-constants";
import {
  PublicBookingAppointmentSection,
  PublicBookingContactSection,
  PublicBookingPatientContextSection,
  PublicBookingSubmitAlerts,
  PublicBookingTurnstileSection,
} from "@/features/public-booking/public-booking-form-sections";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

import {
  stepDescriptionKey,
  stepHeadingKey,
} from "./public-booking-mobile-layout-helpers";

export function PublicBookingMobileStepHeading({
  mobileStep,
  stepHeadingRef,
}: {
  mobileStep: PublicBookingMobileStep;
  stepHeadingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const { t } = useTranslation("PublicBooking");

  return (
    <div
      className={cn(
        "mb-3 sm:mb-4",
        PUBLIC_BOOKING_STEP_HEADING_SCROLL_MARGIN_CLASS,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          className="text-[length:var(--fs-lg)] font-semibold leading-snug tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-[length:var(--fs-xl)]"
          aria-live="polite"
        >
          <span className="font-serif font-semibold tracking-tight">
            {t(stepHeadingKey(mobileStep) ?? "")}
          </span>
        </h2>
        {mobileStep === "visit" ? (
          <PublicBookingHowItWorksSheet appearance="inline" />
        ) : null}
      </div>
      <p className="mt-1 text-[length:var(--fs-xs)] leading-snug text-muted-foreground sm:text-[length:var(--fs-sm)]">
        {t(stepDescriptionKey(mobileStep) ?? "")}
      </p>
    </div>
  );
}

export function PublicBookingMobileVisitStep({
  c,
}: {
  c: PublicBookingPageController;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <PublicBookingTurnstileSection c={c} layout="inline" />
      <PublicBookingAppointmentSection
        c={c}
        compactHeader
        collapseTimeRange
        doctorPickerVariant="chips"
      />
    </div>
  );
}

export function PublicBookingMobileContactStep({
  c,
  facilityWord,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PublicBookingSubmitAlerts c={c} />
      <PublicBookingContactSection
        c={c}
        facilityWord={facilityWord}
        compactHeader
      />
      <PublicBookingPatientContextSection c={c} compactHeader />
    </div>
  );
}

export function PublicBookingMobileReviewStep({
  c,
}: {
  c: PublicBookingPageController;
}) {
  const { t } = useTranslation("PublicBooking");
  const clinic = c.clinic;
  if (!clinic) return null;

  return (
    <div className="flex flex-col gap-4">
      <PublicBookingSubmitAlerts c={c} />
      <PublicBookingReviewBlock c={c} onEdit={c.goToStep} />
      <MicroLabel as="p" className="text-muted-foreground">
        {t("reviewBlock.description")}
      </MicroLabel>
      {clinic.phone || clinic.address ? (
        <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-4 py-3 shadow-sm">
          <MicroLabel as="p" className="mt-0">
            {t("mobileLayout.preferToCall")}
          </MicroLabel>
          {clinic.phone ? (
            <Button
              variant="outline"
              className="mt-2 h-10 w-full rounded-[var(--radius-md)]"
              asChild
            >
              <a
                href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center justify-center gap-2 transition-colors duration-150"
              >
                {t("doneCard.callClinic", { clinicName: clinic.name })}
              </a>
            </Button>
          ) : null}
          {clinic.address ? (
            <p className="mt-2 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              {clinic.address}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PublicBookingMobileBottomBar({
  c,
  mobileStep,
  canContinue,
  continueBlockedReason,
  continueHintId,
  onGoBack,
  onGoForward,
}: {
  c: PublicBookingPageController;
  mobileStep: PublicBookingMobileStep;
  canContinue: boolean;
  continueBlockedReason: string | null;
  continueHintId: string;
  onGoBack: () => void;
  onGoForward: () => void;
}) {
  const { t } = useTranslation("PublicBooking");

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 border-x border-t border-border/60 bg-card/98 px-3 pt-2 shadow-lg supports-[backdrop-filter]:backdrop-blur-md sm:px-4 sm:pt-2.5",
        "rounded-t-[var(--radius-xl)] pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="mx-auto mb-2 w-full max-w-lg md:max-w-2xl sm:mb-2.5">
        <PublicBookingSummaryPeek
          selectedDoctorName={c.selectedDoctorName}
          selectedCalendarDay={c.selectedCalendarDay}
          selectedStart={c.selectedStart}
          selectedEnd={c.selectedEnd}
        />
      </div>

      {mobileStep !== "review" ? (
        <div className="mx-auto flex max-w-lg flex-col gap-1.5 pb-1 md:max-w-2xl">
          {continueBlockedReason ? (
            <p
              id={continueHintId}
              className="text-center text-[length:var(--fs-2xs)] leading-snug text-muted-foreground sm:text-[length:var(--fs-xs)]"
            >
              {continueBlockedReason}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            {mobileStep !== "visit" ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0 px-4 text-[length:var(--fs-sm)]"
                onClick={onGoBack}
              >
                {t("mobileLayout.back")}
              </Button>
            ) : (
              <span className="w-[4.5rem] shrink-0 sm:w-20" aria-hidden />
            )}
            <Button
              type="button"
              className="h-12 min-h-12 flex-1 rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold shadow-sm"
              disabled={!canContinue}
              onClick={onGoForward}
              aria-describedby={
                !canContinue && continueBlockedReason
                  ? continueHintId
                  : undefined
              }
            >
              {t("mobileLayout.continue")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-lg flex-col gap-2 pb-1 md:max-w-2xl">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 shrink-0 px-4 text-[length:var(--fs-sm)]"
              onClick={onGoBack}
            >
              {t("mobileLayout.back")}
            </Button>
            <Button
              type="button"
              className="h-12 min-h-12 flex-1 rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold shadow-sm"
              disabled={c.submit.isPending || !c.submitRequestReady}
              onClick={() => void c.handleSubmit()}
            >
              {c.submit.isPending
                ? t("actionPanel.sending")
                : t("actionPanel.submit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
