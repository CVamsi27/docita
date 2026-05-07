"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pill } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { useDownloadPrescriptionPDF, usePrescriptions } from "@/hooks/api/use-clinical";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { useDebounce } from "@workspace/hooks/use-debounce";

import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { DEFAULT_TIMEZONE, formatClinicTodayPickerIso } from "@workspace/utils";
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
  const { clinic } = useClinic();
  const isDoctorRole =
    user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
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

  const { data: prescriptionsData = [], isLoading: loading } = usePrescriptions({
    search: debouncedSearch || undefined,
    patientId: patientId.trim() ? patientId : undefined,
    ...(hasDateRange ? { startDate, endDate } : {}),
  });
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
    const rows = prescriptionsData;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) {
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
    prescriptionsData,
    debouncedSearch,
  ]);

  const headerDescription = useMemo(() => {
    const dateLabel = (() => {
      if (!hasDateRange) return "all days";
      if (startDate === endDate) {
        return startDate === clinicToday
          ? `today (${clinicToday})`
          : `the day (${startDate})`;
      }
      return `${startDate} to ${endDate}`;
    })();

    if (patientId.trim().length > 0) {
      return `Showing prescriptions for ${dateLabel}, scoped to the selected patient.`;
    }

    if (isDoctorRole) {
      return `Showing prescriptions for ${dateLabel}.`;
    }
    return `View and manage prescriptions for ${dateLabel}.`;
  }, [endDate, hasDateRange, isDoctorRole, patientId, startDate, clinicToday]);

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
            description={headerDescription}
          />
        }
      >
        <PrescriptionsFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
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
