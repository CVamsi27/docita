"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageTabs, type PageTabItem } from "@workspace/ui/components/page-tabs";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { PatientDetailTabLoadingShell } from "@/features/patients/components/details/patient-detail-tab-loading-shell";
import {
  Activity,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  Stethoscope,
} from "lucide-react";
import type {
  Appointment,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientTagManagerContainer as PatientTagManager } from "@/features/patients/components/details/PatientTagManagerContainer";
import type { PatientStatistics } from "@/hooks/use-patient-data";

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

export const PATIENT_DETAIL_TAB_VALUES = [
  "overview",
  "visits",
  "records",
  "prescriptions",
  "vitals",
  "labs",
  "documents",
  "billing",
] as const;

export type PatientDetailTabValue = (typeof PATIENT_DETAIL_TAB_VALUES)[number];

type PatientTabGroup = "summary" | "care" | "money";

const TAB_DEFINITIONS: Array<{
  value: PatientDetailTabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: PatientTabGroup;
}> = [
  { value: "overview", label: "Overview", icon: LayoutDashboard, group: "summary" },
  { value: "vitals", label: "Vitals", icon: Activity, group: "summary" },
  { value: "visits", label: "Visits", icon: Stethoscope, group: "care" },
  { value: "records", label: "Records", icon: ClipboardList, group: "care" },
  { value: "prescriptions", label: "Prescriptions", icon: Pill, group: "care" },
  { value: "labs", label: "Labs", icon: FlaskConical, group: "care" },
  { value: "documents", label: "Documents", icon: FileText, group: "care" },
  { value: "billing", label: "Billing", icon: Receipt, group: "money" },
];

const GROUP_LABEL: Record<PatientTabGroup, string> = {
  summary: "Summary",
  care: "Care",
  money: "Money",
};

const isPatientDetailTabValue = (
  value: string | null,
): value is PatientDetailTabValue =>
  !!value &&
  (PATIENT_DETAIL_TAB_VALUES as readonly string[]).includes(value);

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

  const tabFromUrl = searchParams.get("tab");
  const activeTab: PatientDetailTabValue = isPatientDetailTabValue(tabFromUrl)
    ? tabFromUrl
    : "overview";

  const handleSelectTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const groups = useMemo(() => {
    const seen = new Set<PatientTabGroup>();
    const ordered: PatientTabGroup[] = [];
    for (const tab of TAB_DEFINITIONS) {
      if (!seen.has(tab.group)) {
        seen.add(tab.group);
        ordered.push(tab.group);
      }
    }
    return ordered.map((group) => ({
      group,
      label: GROUP_LABEL[group],
      items: TAB_DEFINITIONS.filter((tab) => tab.group === group).map<PageTabItem>(
        ({ value, label }) => ({ id: value, label }),
      ),
    }));
  }, []);

  return (
    <div role="region" aria-label="Patient detail" className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3" data-testid="patient-detail-tab-bar">
          {groups.map(({ group, label, items }) => (
            <div key={group} className="flex flex-col gap-1">
              <MicroLabel className="px-1">{label}</MicroLabel>
              <PageTabs
                items={items}
                activeId={activeTab}
                onSelect={handleSelectTab}
                ariaLabel={`${label} sections`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <PatientTagManager patientId={patientId} />
        </div>
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          patientId={patientId}
          appointments={appointments}
          statistics={statistics}
          onSelectTab={handleSelectTab}
          onScheduleVisit={onScheduleVisit}
        />
      )}
      {activeTab === "visits" && <VisitsTab patientId={patientId} />}
      {activeTab === "records" && (
        <RecordsTab patient={patient} canEditPatient={canEditPatient} />
      )}
      {activeTab === "prescriptions" && (
        <PrescriptionsTab patientId={patientId} />
      )}
      {activeTab === "vitals" && (
        <VitalsTab
          patientId={patientId}
          appointments={appointments}
          canRecordPatientVitals={canRecordPatientVitals}
        />
      )}
      {activeTab === "labs" && <LabsTab patientId={patientId} />}
      {activeTab === "documents" && <DocumentsTab patientId={patientId} />}
      {activeTab === "billing" && <BillingTab patientId={patientId} />}
    </div>
  );
}
