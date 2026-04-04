import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Patient } from "@workspace/types";

import { usePatients } from "@/hooks/api/use-patients";

type PatientsSortConfig = {
  key: keyof Patient | "fullName";
  direction: "asc" | "desc";
};

export function usePatientsLogic() {
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<PatientsSortConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
        let aValue: string | number | Date | undefined;
        let bValue: string | number | Date | undefined;

        if (sortConfig.key === "fullName") {
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else {
          aValue = a[sortConfig.key as keyof Patient] as
            | string
            | number
            | Date
            | undefined;
          bValue = b[sortConfig.key as keyof Patient] as
            | string
            | number
            | Date
            | undefined;
        }

        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [patientsResponse, sortConfig]);

  const error = queryError ? (queryError as Error).message : null;

  const totalPatients = useMemo(
    () =>
      patientsResponse?.count ?? (patientsResponse as { total?: number })?.total ?? 0,
    [patientsResponse],
  );

  const hasMore = useMemo(() => {
    if (!patientsResponse) return false;
    if (typeof patientsResponse.hasMore === "boolean") {
      return patientsResponse.hasMore;
    }
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

  return {
    state: {
      isLoading,
      error,
      searchQuery,
      sortConfig,
      filteredPatients,
      isAddDialogOpen,
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
      goToPatient: (patientId: string) => router.push(`/patients/${patientId}`),
      schedulePatient: (patientId: string) =>
        router.push(`/appointments?action=new&patientId=${patientId}`),
      openAddDialog: () => setIsAddDialogOpen(true),
      clearSearch: () => setSearchQuery(""),
      goToNextPage,
      goToPrevPage,
    },
  };
}
