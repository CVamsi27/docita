import { useContext } from "react";
import { ClinicContext } from "./clinic-context-inner";
import type { ClinicContextValue } from "./clinic-context-inner";

export function useClinic(): ClinicContextValue {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}

export function useOptionalClinic(): ClinicContextValue | undefined {
  return useContext(ClinicContext);
}
