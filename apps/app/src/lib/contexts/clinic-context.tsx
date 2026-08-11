import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { appClinicSchema } from "@workspace/types";
import { isRecord } from "@workspace/utils";
import { fetchClinicSettings } from "@/lib/api/clinic-settings";
import { useAuth } from "@/lib/auth/auth-context";
import { logger } from "@/lib/monitoring/logger";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { ClinicContext } from "./clinic-context-inner";
import type { Clinic, ClinicContextValue } from "./clinic-context-inner";

export type { Clinic, ClinicContextValue };
export { useClinic, useOptionalClinic } from "./clinic-hooks";

const STORAGE_KEY = "selectedClinicId";

function toBooleanRecord(value: unknown): Record<string, boolean> | null {
  // Intentionally normalizes absent features to `null` (not `undefined`);
  // the permission store treats both as `{}` via `clinic.features || {}`.
  if (!isRecord(value)) return null;
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") result[key] = entry;
  }
  return result;
}

function getStoredClinicId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeClinicId(clinicId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, clinicId);
  } catch {
    // Storage can be unavailable (private mode / disabled); the context still
    // holds the authoritative value for this session.
  }
}

/**
 * Fetches the authoritative clinic record from `/clinics/settings`, caches it,
 * and keeps the permission store in sync (tier, plan mode, addons, feature
 * overrides, facility type). Mounted once per workspace session via
 * `ProvidersWrapper`.
 */
export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(() =>
    user?.clinicId ??
    getStoredClinicId(),
  );
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncFromClinic = usePermissionStore((store) => store.syncFromClinic);
  const setFacilityType = usePermissionStore((store) => store.setFacilityType);

  const refreshClinic = useCallback(async () => {
    try {
      const data = await fetchClinicSettings();
      const parsed = appClinicSchema.safeParse(data);
      if (!parsed.success) {
        logger.warn("Invalid clinic settings payload", {
          error: parsed.error.issues,
        });
        return;
      }
      const clinicData = parsed.data;
      setClinicId(clinicData.id);
      setClinic(clinicData);
      storeClinicId(clinicData.id);
      syncFromClinic({
        tier: clinicData.tier,
        planMode: clinicData.planMode,
        intelligenceAddon: clinicData.intelligenceAddon,
        // The clinic schema stores overrides as a JSON object; the permission
        // store treats every key as a boolean toggle, so narrow the boundary.
        features: toBooleanRecord(clinicData.features),
        type: clinicData.type,
        settings: clinicData.settings,
      });
      if (clinicData.facilityType) {
        setFacilityType(clinicData.facilityType);
      }
    } catch (error) {
      logger.warn("Failed to refresh clinic context", { error });
    } finally {
      setIsLoading(false);
    }
  }, [syncFromClinic, setFacilityType]);

  useEffect(() => {
    void refreshClinic();
  }, [refreshClinic]);

  const value = useMemo<ClinicContextValue>(
    () => ({ clinicId, clinic, isLoading, refreshClinic }),
    [clinicId, clinic, isLoading, refreshClinic],
  );

  return (
    <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
  );
}


