import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { useAuth } from "@/lib/auth/auth-context";
import { logger } from "@/lib/monitoring/logger";
import { appClinicSchema } from "@workspace/types";
import {
  getFacilityLabelFromSettings,
  getStoredClinicId,
  subscribeToWindowFocus,
  toBooleanFeatureOverrides,
} from "./clinic-context-helpers";
import type { Clinic } from "./clinic-context-types";

/**
 * Owns the clinic record's fetch-and-cache lifecycle: resolves the active
 * clinic id (from the session user or local storage) on mount, fetches and
 * caches the authoritative clinic record (debounced, single-flight), keeps
 * the permission store in sync with it, and refetches on window focus.
 * Real-time socket patches are layered on top by `useClinicRealtimeSync`.
 */
export function useClinicDataSync() {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinicState] = useState<Clinic | null>(null);
  const [userClinics, setUserClinics] = useState<Clinic[]>([]);
  const [mounted, setMounted] = useState(false);
  const { syncFromClinic, setFacilityType } = usePermissionStore();
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);

  const updatePermissionsFromClinic = useCallback(
    (clinicData: Clinic) => {
      const featureOverrides = toBooleanFeatureOverrides(clinicData.features);
      syncFromClinic({
        tier: clinicData.tier,
        planMode: clinicData.planMode,
        intelligenceAddon: clinicData.intelligenceAddon,
        features: featureOverrides,
        type: clinicData.type,
        settings: clinicData.settings,
      });

      const facilityType =
        clinicData.facilityType ?? getFacilityLabelFromSettings(clinicData.settings);
      if (facilityType) {
        setFacilityType(facilityType);
      }
    },
    [syncFromClinic, setFacilityType],
  );

  const fetchClinicFromAPI = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (isFetchingRef.current || (!force && now - lastFetchTimeRef.current < 1000)) {
        return;
      }

      try {
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        const response = await fetchWithSession("/clinic/settings", {
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const parsedClinic = appClinicSchema.safeParse(await response.json());
          if (parsedClinic.success) {
            const clinicData = parsedClinic.data;
            setClinicId(clinicData.id);
            setClinicState(clinicData);
            updatePermissionsFromClinic(clinicData);
            localStorage.setItem("selectedClinicId", clinicData.id);
          }
        }
      } catch (error) {
        logger.warn("Failed to refresh clinic context", { error });
      } finally {
        isFetchingRef.current = false;
      }
    },
    [updatePermissionsFromClinic],
  );

  useEffect(() => {
    const storedClinicId = getStoredClinicId();
    const resolvedClinicId = user?.clinicId ?? storedClinicId;
    if (resolvedClinicId) {
      setClinicId(resolvedClinicId);
    }
    setMounted(true);
  }, [user?.clinicId]);

  useSyncExternalStore(
    useCallback(
      (notify) => {
        if (!mounted) return () => {};

        if (!hasFetchedRef.current) {
          hasFetchedRef.current = true;
          fetchClinicFromAPI();
        }

        return subscribeToWindowFocus(() => {
          fetchClinicFromAPI();
          notify();
        });
      },
      [fetchClinicFromAPI, mounted],
    ),
    () => clinicId,
    () => null,
  );

  return {
    clinicId,
    setClinicId,
    clinic,
    setClinicState,
    userClinics,
    setUserClinics,
    updatePermissionsFromClinic,
    fetchClinicFromAPI,
  };
}
