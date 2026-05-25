"use client";

import { useCallback, useMemo } from "react";
import {
  formatCurrency,
  resolveCurrencyContext,
  type FormatCurrencyOptions,
} from "@workspace/utils";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";

export function useClinicCurrency() {
  const clinic = useOptionalClinic()?.clinic;

  const context = useMemo(() => resolveCurrencyContext(clinic), [clinic]);

  const format = useCallback(
    (
      amount: number,
      options: Omit<FormatCurrencyOptions, "currency" | "locale"> & {
        currency?: string | null;
        locale?: string | null;
      } = {},
    ) =>
      formatCurrency(amount, {
        currency: options.currency ?? context.currency,
        locale: options.locale ?? context.locale,
        fractionDigits: options.fractionDigits,
      }),
    [context.currency, context.locale],
  );

  return {
    ...context,
    formatCurrency: format,
  };
}
