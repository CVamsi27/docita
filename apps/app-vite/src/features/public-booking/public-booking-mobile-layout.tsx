"use client";

import { useId, useRef } from "react";
import { PublicBookingProgressChrome } from "@/features/public-booking/public-booking-components";
import { PUBLIC_BOOKING_MOBILE_CONTENT_TAIL_PAD_CLASS, type PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";
import { visitContinueHint, contactContinueHint, PublicBookingMobileStepHeading, PublicBookingMobileVisitStep, PublicBookingMobileContactStep, PublicBookingMobileReviewStep, PublicBookingMobileBottomBar } from "./public-booking-mobile-layout-sections";

const STEP_ORDER: PublicBookingMobileStep[] = ["visit", "contact", "review"];

export function PublicBookingMobileLayout({
  c,
  facilityWord,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
}) {
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const continueHintId = useId();

  const mobileStep = c.mobileStep;
  const stepIndex = STEP_ORDER.indexOf(mobileStep);
  const stepCount = STEP_ORDER.length;

  const visitCanContinue = c.visitCanContinue;
  const contactCanContinue = c.contactCanContinue;

  const canContinue =
    mobileStep === "visit"
      ? visitCanContinue
      : mobileStep === "contact"
        ? contactCanContinue
        : false;

  const continueBlockedReason =
    mobileStep === "visit"
      ? visitContinueHint(visitCanContinue, c.siteKey, c.turnstileToken)
      : mobileStep === "contact"
        ? contactContinueHint(
            contactCanContinue,
            c.firstName,
            c.lastName,
            c.phone,
            c.requiresOtp,
            c.verificationToken,
          )
        : null;

  function goBack() {
    const i = STEP_ORDER.indexOf(c.mobileStep);
    if (i > 0) {
      const prev = STEP_ORDER[i - 1];
      if (prev) c.setMobileStep(prev);
      window.scrollTo({ top: 0, behavior: "auto" });
      requestAnimationFrame(() =>
        stepHeadingRef.current?.focus({ preventScroll: true }),
      );
    }
  }

  function goForward() {
    const i = STEP_ORDER.indexOf(c.mobileStep);
    if (i < STEP_ORDER.length - 1) {
      const next = STEP_ORDER[i + 1];
      if (next) c.setMobileStep(next);
      window.scrollTo({ top: 0, behavior: "auto" });
      requestAnimationFrame(() =>
        stepHeadingRef.current?.focus({ preventScroll: true }),
      );
    }
  }

  if (!c.clinic) return null;

  return (
    <div className="relative mx-auto min-h-0 w-full max-w-lg md:max-w-2xl">
      <PublicBookingProgressChrome
        clinicName={c.clinic.name}
        facilityWord={facilityWord}
        stepIndex={stepIndex}
        stepCount={stepCount}
      />

      <div
        className={cn(
          "px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4",
          PUBLIC_BOOKING_MOBILE_CONTENT_TAIL_PAD_CLASS,
        )}
      >
        <PublicBookingMobileStepHeading
          mobileStep={mobileStep}
          stepHeadingRef={stepHeadingRef}
        />

        {mobileStep === "visit" ? (
          <PublicBookingMobileVisitStep c={c} />
        ) : null}

        {mobileStep === "contact" ? (
          <PublicBookingMobileContactStep
            c={c}
            facilityWord={facilityWord}
          />
        ) : null}

        {mobileStep === "review" ? (
          <PublicBookingMobileReviewStep c={c} />
        ) : null}
      </div>

      <PublicBookingMobileBottomBar
        c={c}
        mobileStep={mobileStep}
        canContinue={canContinue}
        continueBlockedReason={continueBlockedReason}
        continueHintId={continueHintId}
        onGoBack={goBack}
        onGoForward={goForward}
      />
    </div>
  );
}
