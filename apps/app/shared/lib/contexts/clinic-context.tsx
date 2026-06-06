"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useClinicSocket } from "@/hooks/use-clinic-socket";
import { fetchWithSession } from "@/lib/auth/fetch-with-session";
import { useAuth } from "@/lib/auth/auth-context";
import { logger } from "@/lib/monitoring/logger";
import { appClinicSchema, tierSchema, type AppClinic } from "@workspace/types";
import {
  getFacilityLabelFromSettings,
  getStoredClinicId,
  subscribeToWindowFocus,
  toBooleanFeatureOverrides,
} from "./clinic-context-helpers";

export type Clinic = AppClinic;

interface ClinicContextType {
  clinicId: string | null;
  clinic: Clinic | null;
  setClinic: (clinic: Clinic) => void;
  userClinics: Clinic[];
  setUserClinics: (clinics: Clinic[]) => void;
  refreshClinic: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
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
        clinicData.facilityType ??
        getFacilityLabelFromSettings(clinicData.settings);
      if (facilityType) {
        setFacilityType(facilityType);
      }
    },
    [syncFromClinic, setFacilityType],
  );

  const fetchClinicFromAPI = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (
        isFetchingRef.current ||
        (!force && now - lastFetchTimeRef.current < 1000)
      ) {
        return;
      }

      try {
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        const response = await fetchWithSession("/clinic/settings", {
          headers: {
            "Content-Type": "application/json",
          },
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

  useClinicSocket(clinicId, (data) => {
    if (data.clinicId === clinicId) {
      if (
        data.tier ||
        data.intelligenceAddon ||
        data.subscriptionStatus ||
        data.subscriptionGraceUntil !== undefined
      ) {
        void fetchClinicFromAPI(true);
      }
      if (data.tier) {
        const parsedTier = tierSchema.safeParse(data.tier);
        if (parsedTier.success) {
          setClinicState((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, tier: parsedTier.data };
            updatePermissionsFromClinic(updated);
            return updated;
          });
        }
      }
      if (data.intelligenceAddon) {
        setClinicState((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            intelligenceAddon: data.intelligenceAddon ?? prev.intelligenceAddon,
          };
          updatePermissionsFromClinic(updated);
          return updated;
        });
      }
      if (data.subscriptionStatus) {
        const subscriptionStatus = data.subscriptionStatus;
        setClinicState((prev) =>
          prev
            ? {
                ...prev,
                subscriptionStatus,
              }
            : prev,
        );
      }
      if (data.subscriptionGraceUntil !== undefined) {
        setClinicState((prev) =>
          prev
            ? {
                ...prev,
                subscriptionGraceUntil: data.subscriptionGraceUntil,
              }
            : prev,
        );
      }
    }
  });

  const setClinic = (newClinic: Clinic) => {
    const parsedClinic = appClinicSchema.parse(newClinic);
    setClinicId(parsedClinic.id);
    setClinicState(parsedClinic);
    updatePermissionsFromClinic(parsedClinic);
    localStorage.setItem("selectedClinicId", parsedClinic.id);
  };

  return (
    <ClinicContext.Provider
      value={{
        clinicId,
        clinic,
        setClinic,
        userClinics,
        setUserClinics,
        refreshClinic: fetchClinicFromAPI,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) throw new Error("useClinic must be used within a ClinicProvider");
  return context;
}

export function useOptionalClinic() {
  return useContext(ClinicContext);
}
