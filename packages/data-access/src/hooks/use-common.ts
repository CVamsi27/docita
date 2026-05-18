import type { FormOptions } from "@workspace/types";
import { useAPIQuery } from "../core/use-api-query";
import type { AppConstants } from "../types/app-types";

export const useConstants = () =>
  useAPIQuery<AppConstants>(["constants"], "/config/constants", {
    staleTime: 1000 * 60 * 60,
  });

export const useFormOptions = () =>
  useAPIQuery<FormOptions>(["form-options"], "/config/form-options", {
    staleTime: 1000 * 60 * 60,
  });
