import { ReactNode, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router";

import { AppConfig, ClinicSettings, DEFAULT_CONFIG, DefaultValues, FormOptions } from "@/lib/constants/app-config";
import { isNetworkError } from "@/lib/api/network-error";
import { appQueryKeys } from "@/lib/api/query-keys";
import { useOptionalAuth } from "@/lib/auth/auth-context";
import { shouldSkipAuthenticatedBootstrapFetch } from "@/lib/auth/pre-clinic-setup-routes";
import { AppConfigContext } from "./app-config-context-inner";

export type {
  SelectOption,
} from "@/lib/constants/app-config";
export { useOptionalAppConfig } from "./app-config-hooks";

interface AppConfigProviderProps {
  children: ReactNode;
  clinicId?: string;
}

export function AppConfigProvider({
  children,
  clinicId,
}: AppConfigProviderProps) {
  const pathname = useLocation().pathname;
  const auth = useOptionalAuth();
  const scopedClinicId = clinicId ?? auth?.user?.clinicId ?? undefined;
  const scopedUserId = auth?.user?.id;

  const shouldSkipConfigFetch = shouldSkipAuthenticatedBootstrapFetch(pathname);

  const configQuery = useQuery({
    queryKey: appQueryKeys.config.app(scopedClinicId, scopedUserId),
    queryFn: () => Promise.resolve<AppConfig>(DEFAULT_CONFIG),
    enabled:
      !shouldSkipConfigFetch &&
      Boolean(auth?.token && scopedUserId && scopedClinicId),
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




