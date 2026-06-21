"use client";

import { useEffect } from "react";
import { useGuidedTour } from "./guided-tour-provider";

/**
 * Renders nothing. Mounted on `/today` ONLY within the new-clinic empty state,
 * so its presence asserts the "new clinic" precondition; on mount it asks the
 * provider to auto-start the welcome tour once the remaining gates pass
 * (flag on, admin, onboarding complete, server status NOT_STARTED).
 */
export function GuidedTourLauncher() {
  const { autoStartIfEligible } = useGuidedTour();

  useEffect(() => {
    autoStartIfEligible();
  }, [autoStartIfEligible]);

  return null;
}
