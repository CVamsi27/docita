"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  AppConfig,
  ClinicSettings,
  DEFAULT_CONFIG,
  DefaultValues,
  FormOptions,
} from "./constants/app-config";

export type {
  SelectOption,
  DurationOption,
  PatientImportField,
  CurrencyOption,
  FormOptions,
  DefaultValues,
  ClinicSettings,
  AppConfig,
} from "./constants/app-config";

interface AppConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  getFormOptions: <K extends keyof FormOptions>(key: K) => FormOptions[K];
  getDefault: <K extends keyof DefaultValues>(key: K) => DefaultValues[K];
  getClinicSetting: <K extends keyof ClinicSettings>(
    key: K,
  ) => ClinicSettings[K] | undefined;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

interface AppConfigProviderProps {
  children: ReactNode;
  clinicId?: string;
}

export function AppConfigProvider({
  children,
  clinicId,
}: AppConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api/v1";
      const url = clinicId
        ? `${apiUrl}/config?clinicId=${clinicId}`
        : `${apiUrl}/config`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch app configuration");
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {

      setError(err instanceof Error ? err : new Error("Unknown error"));

    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const getFormOptions = useCallback(
    <K extends keyof FormOptions>(key: K): FormOptions[K] => {
      return config.formOptions[key];
    },
    [config],
  );

  const getDefault = useCallback(
    <K extends keyof DefaultValues>(key: K): DefaultValues[K] => {
      return config.defaults[key];
    },
    [config],
  );

  const getClinicSetting = useCallback(
    <K extends keyof ClinicSettings>(key: K): ClinicSettings[K] | undefined => {
      return config.clinicSettings?.[key];
    },
    [config],
  );

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        error,
        refetch: fetchConfig,
        getFormOptions,
        getDefault,
        getClinicSetting,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
}

export function useFormOptions<K extends keyof FormOptions>(
  key: K,
): FormOptions[K] {
  const { getFormOptions } = useAppConfig();
  return getFormOptions(key);
}

export function useDefaultValue<K extends keyof DefaultValues>(
  key: K,
): DefaultValues[K] {
  const { getDefault } = useAppConfig();
  return getDefault(key);
}
