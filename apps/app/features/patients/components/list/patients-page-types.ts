import type { Patient } from "@workspace/types";

export type PatientsSortConfig = {
  key: keyof Patient | "fullName";
  direction: "asc" | "desc";
};

export interface PatientsPageUIProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  searchQuery: string;
  sortConfig: PatientsSortConfig | null;
  filteredPatients: Patient[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSort: (key: keyof Patient | "fullName") => void;
  onViewPatient: (patientId: string) => void;
  onSchedulePatient: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
  onAddPatient: () => void;
  totalPatients: number;
  pageSize: number;
  currentPage: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenConsultationQueue?: () => void;
}
