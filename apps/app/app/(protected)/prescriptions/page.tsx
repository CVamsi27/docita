"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pill } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { EmptyState } from "@workspace/ui/components/empty-state";
import {
  useDownloadPrescriptionPDF,
  usePatientPrescriptions,
  usePrescriptions,
} from "@/hooks/api/use-clinical";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { useDebounce } from "@workspace/hooks/use-debounce";

import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";
import { useAuth } from "@/lib/auth-context";
import { getLocalCalendarDateString } from "@/lib/local-calendar-date";
import { PrescriptionsFilters } from "@/features/prescriptions/components/list/PrescriptionsFilters";
import {
  PrescriptionsTable,
  SortDirection,
  SortKey,
} from "@/features/prescriptions/components/list/PrescriptionsTable";

export default function PrescriptionsPage() {
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId") ?? "";
  const { user } = useAuth();
  const isDoctorRole =
    user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const patientScoped = patientIdFromUrl.length > 0;
  const todayLocal = getLocalCalendarDateString();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: clinicPrescriptions = [], isLoading: clinicLoading } =
    usePrescriptions(
      {
        search: debouncedSearch || undefined,
        ...(isDoctorRole && !patientScoped ? { date: todayLocal } : {}),
      },
      { enabled: !patientScoped },
    );
  const { data: patientPrescriptions = [], isLoading: patientLoading } =
    usePatientPrescriptions(patientIdFromUrl, { limit: 100 }, {
      enabled: patientScoped,
    });
  const loading = patientScoped ? patientLoading : clinicLoading;
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "date",
    direction: "desc",
  });

  const { mutate: downloadPDF } = useDownloadPrescriptionPDF();

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const prescriptions = useMemo(() => {
    const rows = patientScoped ? patientPrescriptions : clinicPrescriptions;
    const q = debouncedSearch.trim().toLowerCase();
    if (!patientScoped || !q) {
      return rows;
    }
    return rows.filter((p) => {
      const name =
        `${p.patient?.firstName ?? ""} ${p.patient?.lastName ?? ""}`.toLowerCase();
      const dx = (p.diagnosis || "").toLowerCase();
      const meds = (p.medications || [])
        .map((m) => (m.name || "").toLowerCase())
        .join(" ");
      return name.includes(q) || dx.includes(q) || meds.includes(q);
    });
  }, [
    patientScoped,
    patientPrescriptions,
    clinicPrescriptions,
    debouncedSearch,
  ]);

  const filteredAndSortedPrescriptions = useMemo(() => {
    const result = [...prescriptions];

    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "patient":
          aValue =
            `${a.patient?.firstName || ""} ${a.patient?.lastName || ""}`.toLowerCase();
          bValue =
            `${b.patient?.firstName || ""} ${b.patient?.lastName || ""}`.toLowerCase();
          break;
        case "diagnosis":
          aValue = (a.diagnosis || "").toLowerCase();
          bValue = (b.diagnosis || "").toLowerCase();
          break;
        case "medications":
          aValue = a.medications?.length || 0;
          bValue = b.medications?.length || 0;
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [prescriptions, sortConfig]);

  return (
    <FeatureGate
      feature={Feature.DIGITAL_PRESCRIPTIONS}
      fallback={
        <AppPageScaffold>
          <EmptyState
            icon={Pill}
            title="Digital prescriptions"
            description="Create and manage digital prescriptions for your patients. Upgrade to Core tier to unlock this feature."
            action={{
              label: "Upgrade to Core",
              href: SUBSCRIPTION_SETTINGS_PATH,
            }}
            className="min-h-[50vh]"
          />
        </AppPageScaffold>
      }
    >
      <AppPageScaffold
        header={
          <PageHeader
            title="Prescriptions"
            description={
              patientScoped
                ? "Prescriptions for the patient from your link. Use search to narrow this list."
                : isDoctorRole
                  ? `Showing prescriptions dated today (${todayLocal}) for quick rounds. Add a patient filter from the consultation workspace when needed.`
                  : "View and manage patient prescriptions."
            }
          />
        }
      >
        <PrescriptionsFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <PrescriptionsTable
          prescriptions={filteredAndSortedPrescriptions}
          loading={loading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onDownloadPDF={downloadPDF}
        />

        <div className="flex items-center justify-between">
          <p className="text-[var(--fs-xs)] text-muted-foreground">
            Showing {filteredAndSortedPrescriptions.length} of {prescriptions.length} prescriptions
          </p>
        </div>
      </AppPageScaffold>
    </FeatureGate>
  );
}
