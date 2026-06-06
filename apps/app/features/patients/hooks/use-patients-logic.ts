import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Feature, type Patient } from "@workspace/types";
import {
  getUserFacingErrorMessage,
  getPatientFullName,
} from "@workspace/utils";

import { usePatients } from "@workspace/data-access";
import { usePermissionStore } from "@/lib/stores/permission-store";

type PatientsSortConfig = {
  key: keyof Patient | "fullName";
  direction: "asc" | "desc";
};

function getPatientSortValue(
  patient: Patient,
  key: PatientsSortConfig["key"],
): string {
  if (key === "fullName") return getPatientFullName(patient).toLowerCase();
  if (key === "gender") return patient.gender ?? "";
  return "";
}

export function usePatientsLogic() {
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<PatientsSortConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingPatientId, setSchedulingPatientId] = useState<
    string | undefined
  >(undefined);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const {
    data: patientsResponse,
    isLoading,
    error: queryError,
    refetch,
  } = usePatients({
    limit: PAGE_SIZE,
    page,
    search: searchQuery.trim() ? searchQuery.trim() : undefined,
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const canAccess = usePermissionStore((state) => state.canAccess);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        const query = newParams.toString();
        router.replace(query ? `/patients?${query}` : "/patients");
      }
    },
    [searchParams, router],
  );

  const handleSort = useCallback((key: keyof Patient | "fullName") => {
    let direction: "asc" | "desc" = "asc";
    setSortConfig((prev) => {
      if (prev && prev.key === key && prev.direction === "asc") {
        direction = "desc";
      }
      return { key, direction };
    });
  }, []);

  const filteredPatients = useMemo(() => {
    const patients = patientsResponse?.items || [];
    const result = [...patients];

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = getPatientSortValue(a, sortConfig.key);
        const bValue = getPatientSortValue(b, sortConfig.key);
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [patientsResponse, sortConfig]);

  const error = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback: "We could not load your patient list. Please try again.",
      })
    : null;

  const totalPatients = useMemo(
    () => patientsResponse?.count ?? 0,
    [patientsResponse],
  );

  const hasMore = useMemo(() => {
    if (!patientsResponse) return false;
    if (typeof patientsResponse.hasMore === "boolean") return patientsResponse.hasMore;
    return page * PAGE_SIZE < totalPatients;
  }, [patientsResponse, page, totalPatients]);

  const canGoPrev = page > 1;

  const goToNextPage = useCallback(() => {
    if (!hasMore) return;
    setPage((current) => current + 1);
  }, [hasMore]);

  const goToPrevPage = useCallback(() => {
    setPage((current) => (current > 1 ? current - 1 : current));
  }, []);

  const handleScheduleDialogChange = useCallback((open: boolean) => {
    setIsScheduleDialogOpen(open);
    if (!open) {
      setSchedulingPatientId(undefined);
    }
  }, []);

  const schedulePatient = useCallback(
    (patientId: string) => {
      if (canAccess(Feature.CALENDAR_SLOTS)) {
        setSchedulingPatientId(patientId);
        setIsScheduleDialogOpen(true);
        return;
      }
      router.push(`/appointments?action=new&patientId=${patientId}`);
    },
    [canAccess, router],
  );

  return {
    state: {
      isLoading,
      error,
      searchQuery,
      sortConfig,
      filteredPatients,
      isAddDialogOpen,
      isScheduleDialogOpen,
      schedulingPatientId,
      editingPatient,
      totalPatients,
      pageSize: PAGE_SIZE,
      currentPage: page,
      canGoPrev,
      canGoNext: hasMore,
    },
    handlers: {
      setSearchQuery,
      handleSort,
      handleDialogChange,
      setEditingPatient,
      onPatientAdded: refetch,
      onPatientUpdated: refetch,
      retry: () => {
        void refetch();
      },
      goToPatient: (patientId: string) => router.push(`/patients/${patientId}`),
      schedulePatient,
      handleScheduleDialogChange,
      openConsultationQueue: () => router.push("/consultation"),
      openAddDialog: () => setIsAddDialogOpen(true),
      clearSearch: () => setSearchQuery(""),
      goToNextPage,
      goToPrevPage,
    },
  };
}
