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
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
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
    search: searchQuery.trim() ? searchQuery.trim() : undefined,
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
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
    let result = [...patients];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((patient) => {
        const fullName =
          `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const phoneNumber = patient.phoneNumber.toLowerCase();
        return fullName.includes(query) || phoneNumber.includes(query);
      });
    }

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
  }, [patientsResponse, searchQuery, sortConfig]);

  const error = queryError ? (queryError as Error).message : null;

  const hasMore = Boolean(
    patientsResponse?.hasMore && patientsResponse?.nextCursor,
  );
  const canGoPrev = cursorHistory.length > 0;

  const goToNextPage = useCallback(() => {
    if (!patientsResponse?.nextCursor) return;
    setCursorHistory((previous) => [...previous, cursor ?? ""]);
    setCursor(patientsResponse.nextCursor);
  }, [patientsResponse?.nextCursor, cursor]);

  const goToPrevPage = useCallback(() => {
    setCursorHistory((previous) => {
      if (previous.length === 0) return previous;
      const nextHistory = [...previous];
      const previousCursor = nextHistory.pop();
      setCursor(previousCursor || undefined);
      return nextHistory;
    });
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
      totalPatients: patientsResponse?.count ?? 0,
      pageSize: PAGE_SIZE,
      currentPage: cursorHistory.length + 1,
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
