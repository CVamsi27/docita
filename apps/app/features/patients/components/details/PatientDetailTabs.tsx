"use client";

import { useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageTabs, type PageTabItem } from "@workspace/ui/components/page-tabs";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { PatientDetailTabLoadingShell } from "@/features/patients/components/details/patient-detail-tab-loading-shell";
import {
  ClipboardList,
  LayoutDashboard,
  Receipt,
  Stethoscope,
} from "lucide-react";
import type {
  Appointment,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientTagManagerContainer as PatientTagManager } from "@/features/patients/components/details/PatientTagManagerContainer";
import type { PatientStatistics } from "@/hooks/use-patient-data";
import { PatientClinicalChartSummary } from "./patient-clinical-chart-summary";
import { usePermissions } from "@/hooks/use-permissions";

const OverviewTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/OverviewTab").then(
      (m) => m.OverviewTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const VisitsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/VisitsTab").then(
      (m) => m.VisitsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const RecordsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/RecordsTab").then(
      (m) => m.RecordsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const PrescriptionsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/PrescriptionsTab").then(
      (m) => m.PrescriptionsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const VitalsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/VitalsTab").then(
      (m) => m.VitalsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const LabsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/LabsTab").then(
      (m) => m.LabsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const DocumentsTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/DocumentsTab").then(
      (m) => m.DocumentsTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

const BillingTab = dynamic(
  () =>
    import("@/features/patients/components/details/tabs/BillingTab").then(
      (m) => m.BillingTab,
    ),
  { loading: () => <PatientDetailTabLoadingShell />, ssr: false },
);

/** Top-level tabs after WS11f consolidation (5 instead of 8). */
export const PATIENT_DETAIL_TAB_VALUES = [
  "overview",
  "visits",
  "records",
  "billing",
] as const;

export type PatientDetailTabValue = (typeof PATIENT_DETAIL_TAB_VALUES)[number];

export const PATIENT_RECORDS_SUB_TABS = [
  "history",
  "vitals",
  "prescriptions",
  "labs",
  "documents",
] as const;

export type PatientRecordsSubTab = (typeof PATIENT_RECORDS_SUB_TABS)[number];

/**
 * Maps legacy `?tab=` values from the 8-tab era to the new tab + sub-tab
 * structure so deep links and bookmarks keep working.
 */
export const LEGACY_PATIENT_TAB_REDIRECTS: Record<
  string,
  { tab: PatientDetailTabValue; subtab?: PatientRecordsSubTab }
> = {
  vitals: { tab: "records", subtab: "vitals" },
  prescriptions: { tab: "records", subtab: "prescriptions" },
  labs: { tab: "records", subtab: "labs" },
  documents: { tab: "records", subtab: "documents" },
};

const TAB_DEFINITIONS: Array<{
  value: PatientDetailTabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "visits", label: "Visits & notes", icon: Stethoscope },
  { value: "records", label: "Records", icon: ClipboardList },
  { value: "billing", label: "Billing", icon: Receipt },
];

const RECORDS_SUB_TAB_LABELS: Record<PatientRecordsSubTab, string> = {
  history: "History & allergies",
  vitals: "Vitals",
  prescriptions: "Prescriptions",
  labs: "Labs",
  documents: "Documents",
};

const isPatientDetailTabValue = (
  value: string | null,
): value is PatientDetailTabValue =>
  !!value &&
  (PATIENT_DETAIL_TAB_VALUES as readonly string[]).includes(value);

const isPatientRecordsSubTab = (
  value: string | null,
): value is PatientRecordsSubTab =>
  !!value &&
  (PATIENT_RECORDS_SUB_TABS as readonly string[]).includes(value);

interface PatientDetailTabsProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
  appointments: Appointment[];
  statistics: PatientStatistics | null;
  canEditPatient: boolean;
  canRecordPatientVitals: boolean;
  onScheduleVisit: () => void;
}

export function PatientDetailTabs({
  patient,
  patientId,
  appointments,
  statistics,
  canEditPatient,
  canRecordPatientVitals,
  onScheduleVisit,
}: PatientDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canViewInvoices } = usePermissions();

  const tabFromUrl = searchParams.get("tab");
  const subtabFromUrl = searchParams.get("subtab");

  const legacyRedirect = tabFromUrl
    ? LEGACY_PATIENT_TAB_REDIRECTS[tabFromUrl]
    : undefined;

  // Back-compat: if the URL still points at one of the retired tabs,
  // rewrite to the new tab + sub-tab so bookmarks and external links
  // keep working.
  useEffect(() => {
    if (!legacyRedirect) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", legacyRedirect.tab);
    if (legacyRedirect.subtab) {
      params.set("subtab", legacyRedirect.subtab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [legacyRedirect, pathname, router, searchParams]);

  const activeTab: PatientDetailTabValue = legacyRedirect
    ? legacyRedirect.tab
    : isPatientDetailTabValue(tabFromUrl)
      ? tabFromUrl
      : "overview";

  const activeRecordsSubTab: PatientRecordsSubTab = legacyRedirect?.subtab
    ? legacyRedirect.subtab
    : isPatientRecordsSubTab(subtabFromUrl)
      ? subtabFromUrl
      : "history";

  useEffect(() => {
    if (activeTab !== "billing") return;
    if (canViewInvoices) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    params.delete("subtab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [activeTab, canViewInvoices, pathname, router, searchParams]);

  const handleSelectTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      params.delete("subtab");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleSelectRecordsSubTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "records");
      if (next === "history") {
        params.delete("subtab");
      } else {
        params.set("subtab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const items = useMemo<PageTabItem[]>(
    () =>
      TAB_DEFINITIONS.filter(
        ({ value }) => value !== "billing" || canViewInvoices,
      ).map(({ value, label }) => ({ id: value, label })),
    [canViewInvoices],
  );

  const recordsSubItems = useMemo<PageTabItem[]>(
    () =>
      (PATIENT_RECORDS_SUB_TABS as readonly PatientRecordsSubTab[]).map(
        (value) => ({ id: value, label: RECORDS_SUB_TAB_LABELS[value] }),
      ),
    [],
  );

  return (
    <div role="region" aria-label="Patient detail" className="w-full">
      <PatientClinicalChartSummary
        patientId={patientId}
        appointments={appointments}
        onSeeAllVisits={() => handleSelectTab("visits")}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div
          className="flex flex-col gap-2"
          data-testid="patient-detail-tab-bar"
        >
          <MicroLabel className="px-1">Sections</MicroLabel>
          <PageTabs
            items={items}
            activeId={activeTab}
            onSelect={handleSelectTab}
            ariaLabel="Patient sections"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <PatientTagManager patientId={patientId} />
        </div>
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          appointments={appointments}
          statistics={statistics}
          onSelectTab={handleSelectTab}
          onNavigateToRecordsSubTab={handleSelectRecordsSubTab}
          onScheduleVisit={onScheduleVisit}
        />
      )}
      {activeTab === "visits" && <VisitsTab patientId={patientId} />}
      {activeTab === "records" && (
        <div className="space-y-4" data-testid="patient-records-subtabs">
          <PageTabs
            items={recordsSubItems}
            activeId={activeRecordsSubTab}
            onSelect={handleSelectRecordsSubTab}
            ariaLabel="Records sub-sections"
          />
          {activeRecordsSubTab === "history" && (
            <RecordsTab patient={patient} canEditPatient={canEditPatient} />
          )}
          {activeRecordsSubTab === "vitals" && (
            <VitalsTab
              patientId={patientId}
              appointments={appointments}
              canRecordPatientVitals={canRecordPatientVitals}
            />
          )}
          {activeRecordsSubTab === "prescriptions" && (
            <PrescriptionsTab patientId={patientId} />
          )}
          {activeRecordsSubTab === "labs" && <LabsTab patientId={patientId} />}
          {activeRecordsSubTab === "documents" && (
            <DocumentsTab patientId={patientId} />
          )}
        </div>
      )}
      {activeTab === "billing" && canViewInvoices ? (
        <BillingTab patientId={patientId} />
      ) : null}
    </div>
  );
}
