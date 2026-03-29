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
import { API_URL } from "@/lib/api-config";

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  gstin?: string | null;
  tier?: "STARTER" | "ESSENTIAL" | "PROFESSIONAL" | "ENTERPRISE" | string;
  type?:
    | "GENERAL"
    | "DENTAL"
    | "PEDIATRIC"
    | "ORTHOPEDIC"
    | "CARDIOLOGY"
    | "DERMATOLOGY"
    | "ENT"
    | "GYNECOLOGY"
    | "OPHTHALMOLOGY"
    | "PSYCHIATRY"
    | "SPECIALTY"
    | string;
  facilityType?: "CLINIC" | "HOSPITAL";
  intelligenceAddon?: "NONE" | "ACTIVE";
  features?: Record<string, boolean>;
  trialEndsAt?: string;
  subscriptionStatus?: string;
  whatsappAutomation?: { enabled: boolean };
  openingTime?: string;
  closingTime?: string;
  slotDuration?: number;
  referralCode?: string | null;
}

interface ClinicContextType {
  clinicId: string | null;
  clinic: Clinic | null;
  setClinic: (clinic: Clinic) => void;
  userClinics: Clinic[];
  setUserClinics: (clinics: Clinic[]) => void;
  refreshClinic: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

function getStoredClinic(): { id: string | null; clinic: Clinic | null } {
  if (typeof window === "undefined") {
    return { id: null, clinic: null };
  }
  try {
    const savedClinicId = localStorage.getItem("selectedClinicId");
    const savedClinic = localStorage.getItem("selectedClinic");
    if (savedClinicId && savedClinic) {
      return { id: savedClinicId, clinic: JSON.parse(savedClinic) };
    }
  } catch {

  }
  return { id: null, clinic: null };
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
      if (clinicData.features) {
        setFeatureOverrides(clinicData.features);
      }

      if (clinicData.type) {
        setClinicType(clinicData.type);
      }

      if (clinicData.facilityType) {
        setFacilityType(clinicData.facilityType);
      }
    },
    [
      setTier,
      setIntelligence,
      setFeatureOverrides,
      setClinicType,
      setFacilityType,
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

      const token = localStorage.getItem("docita_token");
      const response = await fetch(`${API_URL}/clinic/settings`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const clinicData = await response.json();
        if (clinicData && clinicData.id && clinicData.name) {
          setClinicId(clinicData.id);
          setClinicState(clinicData);
          updatePermissionsFromClinic(clinicData);
          localStorage.setItem("selectedClinicId", clinicData.id);
          localStorage.setItem("selectedClinic", JSON.stringify(clinicData));
        }
      }
    } catch {

    } finally {
      isFetchingRef.current = false;
    }
  }, [updatePermissionsFromClinic]);

  useEffect(() => {
    const stored = getStoredClinic();
    if (stored.id && stored.clinic) {
      setClinicId(stored.id);
      setClinicState(stored.clinic);
      updatePermissionsFromClinic(stored.clinic);
    }
    setMounted(true);
  }, [updatePermissionsFromClinic]);

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
        const storedClinic = localStorage.getItem("selectedClinic");
        if (storedClinic) {
          const parsed = JSON.parse(storedClinic);
          parsed.tier = data.tier;
          localStorage.setItem("selectedClinic", JSON.stringify(parsed));
        }
      }
      if (data.intelligenceAddon) {
        setIntelligence(data.intelligenceAddon === "ACTIVE");
      }
    }
  });

  const setClinic = (newClinic: Clinic) => {
    setClinicId(newClinic.id);
    setClinicState(newClinic);

    if (newClinic.tier) {
      setTier(newClinic.tier);
    }
    if (newClinic.intelligenceAddon) {
      setIntelligence(newClinic.intelligenceAddon === "ACTIVE");
    }
    if (newClinic.features) {
      setFeatureOverrides(newClinic.features);
    }

    localStorage.setItem("selectedClinicId", newClinic.id);
    localStorage.setItem("selectedClinic", JSON.stringify(newClinic));
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
