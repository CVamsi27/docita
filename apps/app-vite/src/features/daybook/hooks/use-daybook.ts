import { useMemo, useState } from "react";
import { useInvoices } from "@workspace/data-access";
import { DEFAULT_TIMEZONE, formatClinicTodayPickerIso } from "@workspace/utils";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  aggregateDaybook,
  type DaybookSummary,
} from "@/features/daybook/lib/daybook-aggregate";

export interface UseDaybookResult {
  selectedDayIso: string;
  setSelectedDayIso: (iso: string) => void;
  todayIso: string;
  isToday: boolean;
  summary: DaybookSummary;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * End-of-day reconciliation for a single clinic day. Reuses the existing
 * `/invoices?date=` query (no new backend) and aggregates client-side via the
 * pure {@link aggregateDaybook} helper.
 */
export function useDaybook(): UseDaybookResult {
  const { clinic } = useClinic();
  const clinicTz = clinic?.timezone ?? DEFAULT_TIMEZONE;
  const todayIso = formatClinicTodayPickerIso(clinicTz);
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso);

  const {
    data: invoices = [],
    isLoading,
    isError,
    refetch,
  } = useInvoices({ date: selectedDayIso, limit: 100 });

  const summary = useMemo(() => aggregateDaybook(invoices), [invoices]);

  return {
    selectedDayIso,
    setSelectedDayIso,
    todayIso,
    isToday: selectedDayIso === todayIso,
    summary,
    isLoading,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
