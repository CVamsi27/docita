"use client";

import { useEffect, type CSSProperties } from "react";
import { useGuidedTour } from "./guided-tour-provider";
import {
  useElementRect,
  type ElementRect,
} from "@/features/guided-tour/hooks/use-element-rect";
import { SpotlightMask } from "./spotlight-mask";
import { TourStepCard } from "./tour-step-card";

const CARD_WIDTH = 320;
const GAP = 12;
const EST_CARD_HEIGHT = 190;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cardPosition(rect: ElementRect | null): CSSProperties {
  if (typeof window === "undefined" || !rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(GAP, rect.left), vw - CARD_WIDTH - GAP);
  const below = rect.top + rect.height + GAP;
  const placeAbove =
    below + EST_CARD_HEIGHT > vh && rect.top - GAP - EST_CARD_HEIGHT > 0;
  const top = placeAbove ? rect.top - GAP - EST_CARD_HEIGHT : below;
  return { top, left };
}

/**
 * Renders the spotlight + step card while the welcome tour is active. Mounted
 * once (dynamic, ssr:false) at the protected layout root. Targets resolve by
 * `data-tour-id` selector; a missing target falls back to a centered card.
 */
export function GuidedTourOverlay() {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    next,
    back,
    skip,
  } = useGuidedTour();

  const rect = useElementRect(
    isTourActive ? (currentStep?.targetSelector ?? null) : null,
  );

  useEffect(() => {
    if (!isTourActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTourActive, skip]);

  if (!isTourActive || !currentStep) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <SpotlightMask rect={rect} reducedMotion={prefersReducedMotion()} />
      <div className="fixed z-10" style={cardPosition(rect)}>
        <TourStepCard
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      </div>
    </div>
  );
}
