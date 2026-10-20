import { internalClinicListResponseSchema } from "@workspace/types";

export function normalizeClinicsList(payload: unknown) {
  return internalClinicListResponseSchema.parse(payload).items;
}
