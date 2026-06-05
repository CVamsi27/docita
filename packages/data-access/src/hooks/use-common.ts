import type { FormOptions } from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";
import type { AppConstants } from "../types/app-types";

export const useConstants = () =>
  useAPIQuery<AppConstants>(
    queryKeys.appConfig.constants(),
    "/config/constants",
    {
      staleTime: 1000 * 60 * 60,
    },
  );

export const useFormOptions = () =>
  useAPIQuery<FormOptions>(
    queryKeys.appConfig.formOptions(),
    "/config/form-options",
    {
      staleTime: 1000 * 60 * 60,
    },
  );
