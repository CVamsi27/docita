"use client";

import { useId, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  BookingActionPanel,
  PublicBookingHowItWorksSheet,
  PublicBookingProgressChrome,
  PublicBookingReviewBlock,
  PublicBookingSummaryPeek,
} from "@/features/public-booking/public-booking-components";
import {
  PUBLIC_BOOKING_MOBILE_CONTENT_TAIL_PAD_CLASS,
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

const STEP_ORDER: PublicBookingMobileStep[] = ["visit", "contact", "review"];

function stepLabel(step: PublicBookingMobileStep): string {
  switch (step) {
    case "visit":
      return "Doctor, date, and time";
    case "contact":
      return "Your contact details";
    case "review":
      return "Review and send";
    default:
      return "";
  }
}

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

  function visitContinueHint(): string | null {
    if (visitCanContinue) return null;
    if (c.siteKey && !c.turnstileToken) {
      return "Complete verification above, then continue.";
    }
    return null;
  }

  function contactContinueHint(): string | null {
    if (contactCanContinue) return null;
    if (!c.firstName.trim() || !c.lastName.trim()) {
      return "Enter your first and last name.";
    }
    if (!c.phone.trim()) {
      return "Enter the phone number this clinic has on file.";
    }
    if (c.requiresOtp === true && !c.verificationToken) {
      return "Request the WhatsApp code and enter it above.";
    }
    return null;
  }

  const continueBlockedReason =
    mobileStep === "visit"
      ? visitContinueHint()
      : mobileStep === "contact"
        ? contactContinueHint()
        : null;

  function goBack() {
    const i = STEP_ORDER.indexOf(c.mobileStep);
    if (i > 0) {
      c.setMobileStep(STEP_ORDER[i - 1]!);
      window.scrollTo({ top: 0, behavior: "auto" });
      requestAnimationFrame(() =>
        stepHeadingRef.current?.focus({ preventScroll: true }),
      );
    }
  }

  function goForward() {
    const i = STEP_ORDER.indexOf(c.mobileStep);
    if (i < STEP_ORDER.length - 1) {
      c.setMobileStep(STEP_ORDER[i + 1]!);
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
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          className={cn(
            "mb-3 text-[length:var(--fs-lg)] font-semibold leading-snug tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:mb-4 sm:text-[length:var(--fs-xl)]",
            PUBLIC_BOOKING_STEP_HEADING_SCROLL_MARGIN_CLASS,
          )}
          aria-live="polite"
        >
          <span className="font-serif font-semibold tracking-tight">
            {stepLabel(mobileStep)}
          </span>
        </h2>

        {mobileStep === "visit" ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="rounded-[var(--radius-lg)] border border-border/55 bg-muted/20 px-3 py-3 shadow-sm sm:px-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="min-w-0 flex-1 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  Pick a day to see open times. Add a doctor or slot if you want — optional before you
                  continue.
                </p>
                <PublicBookingHowItWorksSheet appearance="chip" />
              </div>
            </div>
            <PublicBookingTurnstileSection c={c} layout="inline" />
            <PublicBookingAppointmentSection
              c={c}
              compactHeader
              collapseTimeRange
            />
          </div>
        ) : null}

        {mobileStep === "contact" ? (
          <div className="flex flex-col gap-4">
            <PublicBookingSubmitAlerts c={c} />
            <PublicBookingContactSection
              c={c}
              facilityWord={facilityWord}
              compactHeader
            />
            <PublicBookingPatientContextSection c={c} compactHeader />
          </div>
        ) : null}

        {mobileStep === "review" ? (
          <div className="flex flex-col gap-4">
            <PublicBookingSubmitAlerts c={c} />
            <PublicBookingReviewBlock c={c} onEdit={c.goToStep} />
            <MicroLabel as="p" className="text-muted-foreground">
              Submitting sends a request only — the clinic confirms before your visit is final.
            </MicroLabel>
            {c.clinic.phone || c.clinic.address ? (
              <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 px-4 py-3 shadow-sm">
                <MicroLabel as="p" className="mt-0">
                  Prefer to call?
                </MicroLabel>
                {c.clinic.phone ? (
                  <Button
                    variant="outline"
                    className="mt-2 h-10 w-full rounded-[var(--radius-md)]"
                    asChild
                  >
                    <a
                      href={`tel:${c.clinic.phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center justify-center gap-2 transition-colors duration-150"
                    >
                      Call {c.clinic.name}
                    </a>
                  </Button>
                ) : null}
                {c.clinic.address ? (
                  <p className="mt-2 text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                    {c.clinic.address}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-20 border-x border-t border-border/65 bg-card/98 px-3 pt-1.5 shadow-lg supports-[backdrop-filter]:backdrop-blur-md sm:px-4 sm:pt-2",
          "rounded-t-[var(--radius-lg)] pb-[max(0.375rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="mx-auto mb-1.5 w-full max-w-lg md:max-w-2xl sm:mb-2">
          <PublicBookingSummaryPeek
            selectedDoctorName={c.selectedDoctorName}
            selectedCalendarDay={c.selectedCalendarDay}
            selectedStart={c.selectedStart}
            selectedEnd={c.selectedEnd}
          />
        </div>

        {mobileStep !== "review" ? (
          <div className="mx-auto flex max-w-lg flex-col gap-2 pb-1 md:max-w-2xl">
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
                  className="h-11 shrink-0 px-3"
                  onClick={goBack}
                >
                  Back
                </Button>
              ) : (
                <span className="w-[4.25rem] shrink-0 sm:w-20" aria-hidden />
              )}
              <Button
                type="button"
                className="h-11 min-h-11 flex-1 rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold shadow-sm"
                disabled={!canContinue}
                onClick={goForward}
                aria-describedby={
                  !canContinue && continueBlockedReason ? continueHintId : undefined
                }
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-2 pb-1 md:max-w-2xl">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={goBack}
            >
              Back
            </Button>
            <BookingActionPanel
              variant="compact"
              submitEnabled={c.submitRequestReady}
              className={cn(
                "border-0 bg-transparent shadow-none [&_.shadow-sm]:shadow-none",
                "max-md:[&_[data-slot=card-content]]:space-y-2 max-md:[&_[data-slot=card-content]]:py-2.5",
              )}
              onSubmit={() => void c.handleSubmit()}
              isSubmitting={c.submit.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}
