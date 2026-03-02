"use client";

import { useMemo, useState } from "react";
import { Pill } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import {
  useDownloadPrescriptionPDF,
  usePrescriptions,
} from "@/hooks/api/use-clinical";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { useDebounce } from "@workspace/hooks/use-debounce";

import { PrescriptionsFilters } from "@/features/prescriptions/components/list/PrescriptionsFilters";
import {
  PrescriptionsTable,
  SortDirection,
  SortKey,
} from "@/features/prescriptions/components/list/PrescriptionsTable";

export default function PrescriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: prescriptions = [], isLoading: loading } = usePrescriptions({
    search: debouncedSearch,
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Pill className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Digital Prescriptions</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create and manage digital prescriptions for your patients. Upgrade
            to Core tier to unlock this feature.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Core</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
            <p className="text-muted-foreground">
              View and manage all patient prescriptions.
            </p>
          </div>
        </div>

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
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPrescriptions.length} of{" "}
            {prescriptions.length} prescriptions
          </p>
        </div>
      </div>
    </FeatureGate>
  );
}
