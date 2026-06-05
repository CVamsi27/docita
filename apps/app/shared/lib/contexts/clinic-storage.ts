import { logger } from "@/lib/monitoring/logger";

export function getStoredClinicId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const savedClinicId = localStorage.getItem("selectedClinicId");
    localStorage.removeItem("selectedClinic");
    return savedClinicId && savedClinicId.length > 0 ? savedClinicId : null;
  } catch (error) {
    logger.warn("Failed to read selected clinic from localStorage", { error });
  }
  return null;
}
