"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  useRef,
  useEffect,
} from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSocket } from "@/lib/socket-context";

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: "CAPTURE" | "CORE" | "PLUS" | "PRO" | "ENTERPRISE";
  intelligenceAddon?: "NONE" | "ACTIVE";
  features?: Record<string, boolean>;
  trialEndsAt?: string;
  subscriptionStatus?: string;
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

// Helper to read clinic from localStorage
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
    // Silently handle parse errors
  }
  return { id: null, clinic: null };
}

// Subscribe to window focus/visibility for external store
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

// Subscribe to socket events
function useSocketSubscription(
  socket: ReturnType<typeof useSocket>["socket"],
  isConnected: boolean,
  clinicId: string | null,
  onUpdate: (data: {
    clinicId: string;
    tier?: string;
    intelligenceAddon?: string;
  }) => void,
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useSyncExternalStore(
    useCallback(
      (notify) => {
        if (!socket || !isConnected || !clinicId) return () => {};

        socket.emit("subscribe:clinic", clinicId);

        const handleClinicUpdate = (data: {
          clinicId: string;
          tier?: string;
          intelligenceAddon?: string;
          subscriptionStatus?: string;
        }) => {
          callbackRef.current(data);
          notify();
        };

        socket.on("clinic:update", handleClinicUpdate);

        return () => {
          socket.off("clinic:update", handleClinicUpdate);
        };
      },
      [socket, isConnected, clinicId],
    ),
    () => null,
    () => null,
  );
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  // Start with null on both server and client to avoid hydration mismatch
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinicState] = useState<Clinic | null>(null);
  const [userClinics, setUserClinics] = useState<Clinic[]>([]);
  const [mounted, setMounted] = useState(false);
  const { setTier, setIntelligence, setFeatureOverrides } =
    usePermissionStore();
  const { socket, isConnected } = useSocket();
  const hasFetchedRef = useRef(false);

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
    },
    [setTier, setIntelligence, setFeatureOverrides],
  );

  const fetchClinicFromAPI = useCallback(async () => {
    try {
      const token = localStorage.getItem("docita_token");
      if (!token) return;

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/clinic/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
      // Silently handle API errors
    }
  }, [updatePermissionsFromClinic]);

  // Load from localStorage after component mounts (client-side only)
  useEffect(() => {
    const stored = getStoredClinic();
    if (stored.id && stored.clinic) {
      setClinicId(stored.id);
      setClinicState(stored.clinic);
      updatePermissionsFromClinic(stored.clinic);
    }
    setMounted(true);
  }, [updatePermissionsFromClinic]);

  // Use useSyncExternalStore for window focus/visibility - triggers refresh on focus
  useSyncExternalStore(
    useCallback(
      (notify) => {
        // Only run after mounted
        if (!mounted) return () => {};

        // Initial fetch on mount
        if (!hasFetchedRef.current) {
          hasFetchedRef.current = true;
          // Then fetch fresh data
          fetchClinicFromAPI();
        }

        // Subscribe to focus/visibility changes
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

  // Handle WebSocket clinic updates
  useSocketSubscription(socket, isConnected, clinicId, (data) => {
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

    // Update permission store
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
