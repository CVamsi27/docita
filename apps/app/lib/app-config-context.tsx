"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import {
  AppConfig,
  ClinicSettings,
  DEFAULT_CONFIG,
  DefaultValues,
  FormOptions,
} from "./constants/app-config";
import { apiFetch } from "./api-client";
import { isNetworkError } from "./network-error";
import { appQueryKeys } from "./query-keys";

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
  const pathname = usePathname();

  const shouldSkipConfigFetch =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/clinic-selection" ||
    pathname.startsWith("/clinic-selection/");

  const configQuery = useQuery({
    queryKey: appQueryKeys.config.app(clinicId),
    queryFn: () =>
      apiFetch<AppConfig>(
        clinicId ? `/config?clinicId=${clinicId}` : "/config",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      ),
    enabled: !shouldSkipConfigFetch,
  });

  const config = shouldSkipConfigFetch
    ? DEFAULT_CONFIG
    : (configQuery.data ?? DEFAULT_CONFIG);
  const isLoading = shouldSkipConfigFetch ? false : configQuery.isLoading;
  const error = shouldSkipConfigFetch
    ? null
    : configQuery.error && !isNetworkError(configQuery.error)
      ? configQuery.error instanceof Error
        ? configQuery.error
        : new Error("We could not load your clinic settings. Please try again.")
      : null;

  const fetchConfig = useCallback(async () => {
    await configQuery.refetch();
  }, [configQuery]);

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
