import { api } from "./api-client";

/** Fetch the authoritative clinic settings payload for the current session. */
export function fetchClinicSettings(): Promise<unknown> {
  return api.get<unknown>("/clinics/settings");
}
