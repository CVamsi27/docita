import { AppConstants, FormOptions, useAPIQuery } from "@/lib/api-core";

export const useConstants = () =>
  useAPIQuery<AppConstants>(["constants"], "/config/constants", {
    staleTime: 1000 * 60 * 60,
  });

export const useFormOptions = () =>
  useAPIQuery<FormOptions>(["form-options"], "/config/form-options", {
    staleTime: 1000 * 60 * 60,
  });
