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
import { fetchWithSession } from "@/lib/fetch-with-session";
import { appClinicSchema, type AppClinic } from "@workspace/types";

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

function getStoredClinicId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const savedClinicId = localStorage.getItem("selectedClinicId");
    localStorage.removeItem("selectedClinic");
    return savedClinicId && savedClinicId.length > 0 ? savedClinicId : null;
  } catch {}
  return null;
}

function subscribeToWindowFocus(callback: () => void) {
  const handleFocus = () => callback();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

function toBooleanFeatureOverrides(
  value: Clinic["features"],
): Record<string, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
}

function getFacilityLabelFromSettings(
  value: Clinic["settings"],
): "CLINIC" | "HOSPITAL" | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const facilityLabel = Object.fromEntries(Object.entries(value)).facilityLabel;
  return facilityLabel === "CLINIC" || facilityLabel === "HOSPITAL"
    ? facilityLabel
    : undefined;
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinicState] = useState<Clinic | null>(null);
  const [userClinics, setUserClinics] = useState<Clinic[]>([]);
  const [mounted, setMounted] = useState(false);
  const {
    setTier,
    setIntelligence,
    setFeatureOverrides,
    setClinicType,
    setFacilityType,
    setWorkspaceProfile,
  } = usePermissionStore();
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);

  const updatePermissionsFromClinic = useCallback(
    (clinicData: Clinic) => {
      if (clinicData.tier) {
        setTier(clinicData.tier);
      }
      if (clinicData.intelligenceAddon) {
        setIntelligence(clinicData.intelligenceAddon === "ACTIVE");
      }
      const featureOverrides = toBooleanFeatureOverrides(clinicData.features);
      if (featureOverrides) {
        setFeatureOverrides(featureOverrides);
      }

      if (clinicData.type) {
        setClinicType(clinicData.type);
      }

      const settingsWorkspaceProfile =
        clinicData.settings &&
        typeof clinicData.settings === "object" &&
        !Array.isArray(clinicData.settings)
          ? (clinicData.settings as Record<string, unknown>).workspaceProfile
          : undefined;
      if (clinicData.tier === "FRONT_DESK") {
        setWorkspaceProfile("FRONT_DESK");
      } else {
        setWorkspaceProfile(clinicData.workspaceProfile ?? settingsWorkspaceProfile);
      }

      const facilityType =
        clinicData.facilityType ??
        getFacilityLabelFromSettings(clinicData.settings);
      if (facilityType) {
        setFacilityType(facilityType);
      }
    },
    [
      setTier,
      setIntelligence,
      setFeatureOverrides,
      setClinicType,
      setFacilityType,
      setWorkspaceProfile,
    ],
  );

  const fetchClinicFromAPI = useCallback(async () => {
    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchTimeRef.current < 1000) {
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
    } catch {
    } finally {
      isFetchingRef.current = false;
    }
  }, [updatePermissionsFromClinic]);

  useEffect(() => {
    const storedClinicId = getStoredClinicId();
    if (storedClinicId) {
      setClinicId(storedClinicId);
    }
    setMounted(true);
  }, []);

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
      if (data.tier) {
        setTier(data.tier);
        setClinicState((prev) =>
          prev ? { ...prev, tier: data.tier as Clinic["tier"] } : prev,
        );
      }
      if (data.intelligenceAddon) {
        setIntelligence(data.intelligenceAddon === "ACTIVE");
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

    if (parsedClinic.tier) {
      setTier(parsedClinic.tier);
    }
    if (parsedClinic.intelligenceAddon) {
      setIntelligence(parsedClinic.intelligenceAddon === "ACTIVE");
    }
    const featureOverrides = toBooleanFeatureOverrides(parsedClinic.features);
    if (featureOverrides) {
      setFeatureOverrides(featureOverrides);
    }

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
  if (context === undefined) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}

export function useOptionalClinic() {
  return useContext(ClinicContext);
}
