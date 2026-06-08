"use client";

import React, { createContext, useContext } from "react";
import { appClinicSchema, type AppClinic } from "@workspace/types";
import { useClinicDataSync } from "./use-clinic-data-sync";
import { useClinicRealtimeSync } from "./use-clinic-realtime-sync";

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

/**
 * Composes the clinic context's two cohesive concerns — fetch-and-cache
 * lifecycle (`useClinicDataSync`) and real-time socket patches
 * (`useClinicRealtimeSync`) — and exposes the combined `ClinicContextType`
 * the rest of the app consumes via `useClinic`/`useOptionalClinic`.
 */
export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const sync = useClinicDataSync();
  useClinicRealtimeSync({
    clinicId: sync.clinicId,
    setClinicState: sync.setClinicState,
    updatePermissionsFromClinic: sync.updatePermissionsFromClinic,
    fetchClinicFromAPI: sync.fetchClinicFromAPI,
  });

  const setClinic = (newClinic: Clinic) => {
    const parsedClinic = appClinicSchema.parse(newClinic);
    sync.setClinicId(parsedClinic.id);
    sync.setClinicState(parsedClinic);
    sync.updatePermissionsFromClinic(parsedClinic);
    localStorage.setItem("selectedClinicId", parsedClinic.id);
  };

  return (
    <ClinicContext.Provider
      value={{
        clinicId: sync.clinicId,
        clinic: sync.clinic,
        setClinic,
        userClinics: sync.userClinics,
        setUserClinics: sync.setUserClinics,
        refreshClinic: sync.fetchClinicFromAPI,
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
