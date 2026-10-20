import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { type Patient } from "@workspace/types";
import {
  getUserFacingErrorMessage,
  getPatientFullName,
} from "@workspace/utils";

import { usePatients } from "@workspace/data-access";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { usePatientsDialogs } from "./use-patients-dialogs";

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
  const navigate = useNavigate();
  const canAccess = usePermissionStore((state) => state.canAccess);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const {
    isAddDialogOpen,
    isScheduleDialogOpen,
    schedulingPatientId,
    editingPatient,
    setEditingPatient,
    setIsAddDialogOpen,
    handleDialogChange,
    handleScheduleDialogChange,
    schedulePatient,
  } = usePatientsDialogs(canAccess);

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
    () => patientsResponse?.total ?? 0,
    [patientsResponse],
  );

  const hasMore = useMemo(
    () => Boolean(patientsResponse) && page * PAGE_SIZE < totalPatients,
    [patientsResponse, page, totalPatients],
  );

  const canGoPrev = page > 1;

  const goToNextPage = useCallback(() => {
    if (!hasMore) return;
    setPage((current) => current + 1);
  }, [hasMore]);

  const goToPrevPage = useCallback(() => {
    setPage((current) => (current > 1 ? current - 1 : current));
  }, []);

  const goToPatient = useCallback(
    (patientId: string) => {
      navigate(`/patients/${patientId}`);
    },
    [navigate],
  );

  const openConsultationQueue = useCallback(() => {
    navigate("/consultation");
  }, [navigate]);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const openAddDialog = useCallback(() => setIsAddDialogOpen(true), [setIsAddDialogOpen]);

  const onPatientAdded = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onPatientUpdated = useCallback(() => {
    void refetch();
  }, [refetch]);

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
      clearSearch,
      handleSort,
      goToPatient,
      schedulePatient,
      setEditingPatient,
      openAddDialog,
      handleDialogChange,
      handleScheduleDialogChange,
      goToPrevPage,
      goToNextPage,
      openConsultationQueue,
      retry,
      onPatientAdded,
      onPatientUpdated,
    },
  };
}
