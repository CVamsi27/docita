"use client";

import { usePublicBookingFieldValidations } from "@/features/public-booking/use-public-booking-field-validations";
import {
  usePublicBookingReadinessState,
  type PublicBookingFieldParams,
} from "@/features/public-booking/use-public-booking-readiness-state";

interface DerivedStateParams extends PublicBookingFieldParams {
  submitFieldErrors: Record<string, string>;
}

export function usePublicBookingDerivedState(params: DerivedStateParams) {
  const validations = usePublicBookingFieldValidations(params.submitFieldErrors);
  const readiness = usePublicBookingReadinessState(params);

  return { ...validations, ...readiness };
}
