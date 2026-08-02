import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { DEFAULT_TIMEZONE, formatClinicTodayPickerIso } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { isDoctor } from "@/lib/auth/permissions";
import { useClinic } from "@/lib/contexts/clinic-context";

/**
 * Owns the prescriptions page's filter inputs — search text (debounced),
 * patient scope (synced from the URL), date range, and the clinic/role
 * context those filters are evaluated against. Split out from
 * `usePrescriptionsPageState` so the "what is the user filtering by" concern
 * is independent of the "what does the filtered query return" concern.
 */
export function usePrescriptionsFilters() {
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId") ?? "";
  const { user } = useAuth();
  const { clinic } = useClinic();
  const isDoctorRole = isDoctor(user?.role);
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const clinicToday = formatClinicTodayPickerIso(clinicTz);

  const [searchQuery, setSearchQuery] = useState("");
  const [patientId, setPatientId] = useState(patientIdFromUrl);
  const [startDate, setStartDate] = useState(clinicToday);
  const [endDate, setEndDate] = useState(clinicToday);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPatientId(patientIdFromUrl);
  }, [patientIdFromUrl]);

  const hasDateRange = startDate.trim().length > 0 && endDate.trim().length > 0;

  return {
    isDoctorRole,
    clinicToday,
    searchQuery,
    setSearchQuery,
    patientId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    debouncedSearch,
    hasDateRange,
  };
}

export type PrescriptionsFiltersState = ReturnType<typeof usePrescriptionsFilters>;
