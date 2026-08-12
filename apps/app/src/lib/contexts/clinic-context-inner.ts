import { createContext } from "react";
import type { AppClinic } from "@workspace/types";

export type Clinic = AppClinic;

export interface ClinicContextValue {
  clinicId: string | null;
  clinic: Clinic | null;
  isLoading: boolean;
  refreshClinic: () => Promise<void>;
}

export const ClinicContext = createContext<ClinicContextValue | undefined>(undefined);
