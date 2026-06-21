import type {
  GuidedTourState,
  UpdateGuidedTourRequest,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIMutation } from "../core/use-api-mutation";

/**
 * Server-authoritative guided-tour / getting-started-checklist state for the
 * current user (`GET /users/guided-tour`). Cross-device + multi-tab consistent:
 * mutations invalidate this key. See `useUpdateGuidedTour`.
 */
export const useGuidedTourState = (queryOptions?: { enabled?: boolean }) =>
  useAPIQuery<GuidedTourState>(queryKeys.guidedTour.me(), "/users/guided-tour", {
    enabled: queryOptions?.enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

/** Patch tour status / resume step / checklist dismissal (`PATCH /users/guided-tour`). */
export const useUpdateGuidedTour = () =>
  useAPIMutation<GuidedTourState, UpdateGuidedTourRequest>(
    "/users/guided-tour",
    "PATCH",
    { invalidateKeys: [queryKeys.guidedTour.me()] },
  );
