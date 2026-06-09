"use client";

import { useMemo } from "react";
import {
  computeUnknownSubmitErrors,
  computeSlotRangeSubmitError,
} from "@/features/public-booking/public-booking-page-state-helpers";

export function usePublicBookingFieldValidations(
  submitFieldErrors: Record<string, string>,
) {
  const unknownSubmitErrors = useMemo(
    () => computeUnknownSubmitErrors(submitFieldErrors),
    [submitFieldErrors],
  );
  const slotRangeSubmitError = useMemo(
    () =>
      computeSlotRangeSubmitError(
        submitFieldErrors.requestedSlotStart,
        submitFieldErrors.requestedSlotEnd,
      ),
    [submitFieldErrors],
  );

  return { unknownSubmitErrors, slotRangeSubmitError };
}
