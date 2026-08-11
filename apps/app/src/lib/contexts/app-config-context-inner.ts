import { createContext } from "react";
import type { AppConfig, ClinicSettings, DefaultValues, FormOptions } from "@/lib/constants/app-config";

export interface AppConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getFormOptions: <K extends keyof FormOptions>(key: K) => FormOptions[K];
  getDefault: <K extends keyof DefaultValues>(key: K) => DefaultValues[K];
  getClinicSetting: <K extends keyof ClinicSettings>(key: K) => ClinicSettings[K] | undefined;
}

export const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);
