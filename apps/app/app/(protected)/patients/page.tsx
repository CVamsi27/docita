"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { apiHooks } from "@/lib/api-hooks";
import { Patient } from "@workspace/types";
import {
  AddPatientDialog,
  EditPatientDialog,
} from "@/features/patients/components";

import { useRouter, useSearchParams } from "next/navigation";
import { PatientsTable } from "@/features/patients/components/table/PatientsTable";
import { PatientsFilters } from "@/features/patients/components/table/PatientsFilters";

function PatientsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: patientsResponse,
    isLoading: loading,
    error: queryError,
    refetch,
  } = apiHooks.usePatients({ search: debouncedSearch });
  const error = queryError ? (queryError as Error).message : null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Patient | "fullName";
    direction: "asc" | "desc";
  } | null>(null);
  const [filterType, setFilterType] = useState<"all" | "recent" | "new">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Open dialog from URL params
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
        // Remove the query param when dialog closes
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        router.replace(`/patients?${newParams.toString()}`);
      }
    },
    [searchParams, router],
  );

  const handleSort = (key: keyof Patient | "fullName") => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    // Extract items from paginated responses
    const patients = patientsResponse?.items || [];
    let result = [...patients];

    // 1. Smart Filters (Pre-sort/Filter)
    if (filterType === "recent") {
      // Sort by updatedAt desc
      result.sort((a, b) => {
        const da = new Date(a.updatedAt || 0).getTime();
        const db = new Date(b.updatedAt || 0).getTime();
        return db - da;
      });
    } else if (filterType === "new") {
      // Sort by createdAt desc
      result.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      });
    }

    // 2. Search Filter removed - now handled by backend
    // result = result.filter(...)

    // 3. Column Sort (Overrides Smart Filter sort if active)
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
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [patientsResponse, searchQuery, sortConfig, filterType]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage your patient records and history.
          </p>
        </div>

        <AddPatientDialog
          open={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          onPatientAdded={() => refetch()}
        />
        <EditPatientDialog
          patient={editingPatient}
          open={!!editingPatient}
          onOpenChange={(open: boolean) => !open && setEditingPatient(null)}
          onPatientUpdated={() => refetch()}
        />
      </div>

      <div className="space-y-4">
        <PatientsFilters
          filterType={filterType}
          onFilterChange={setFilterType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <PatientsTable
          patients={filteredPatients}
          isLoading={loading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={setEditingPatient}
          onSchedule={(patient) =>
            router.push(`/appointments?action=new&patientId=${patient.id}`)
          }
          onRowClick={(id) => router.push(`/patients/${id}`)}
          emptyMessage={
            searchQuery
              ? `No patients found matching "${searchQuery}"`
              : "No patients found."
          }
        />
      </div>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientsContent />
    </Suspense>
  );
}
