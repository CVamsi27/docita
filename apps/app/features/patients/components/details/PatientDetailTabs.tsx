"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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

const TAB_DEFINITIONS: Array<{
  value: PatientDetailTabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "visits", label: "Visits", icon: Stethoscope },
  { value: "records", label: "Records", icon: ClipboardList },
  { value: "prescriptions", label: "Prescriptions", icon: Pill },
  { value: "vitals", label: "Vitals", icon: Activity },
  { value: "labs", label: "Lab Tests", icon: FlaskConical },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "billing", label: "Billing", icon: Receipt },
];

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

  const tabsList = useMemo(
    () => (
      <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-1">
        {TAB_DEFINITIONS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex-1 sm:flex-none whitespace-nowrap"
          >
            <Icon className="mr-1.5 h-4 w-4" aria-hidden />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    ),
    [],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleSelectTab} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        {tabsList}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <PatientTagManager patientId={patientId} />
        </div>
      </div>

      <TabsContent value="overview" className="mt-0">
        <OverviewTab
          patientId={patientId}
          appointments={appointments}
          statistics={statistics}
          onSelectTab={handleSelectTab}
          onScheduleVisit={onScheduleVisit}
        />
      </TabsContent>

      <TabsContent value="visits" className="mt-0">
        <VisitsTab patientId={patientId} />
      </TabsContent>

      <TabsContent value="records" className="mt-0">
        <RecordsTab patient={patient} canEditPatient={canEditPatient} />
      </TabsContent>

      <TabsContent value="prescriptions" className="mt-0">
        <PrescriptionsTab patientId={patientId} />
      </TabsContent>

      <TabsContent value="vitals" className="mt-0">
        <VitalsTab
          patientId={patientId}
          appointments={appointments}
          canRecordPatientVitals={canRecordPatientVitals}
        />
      </TabsContent>

      <TabsContent value="labs" className="mt-0">
        <LabsTab patientId={patientId} />
      </TabsContent>

      <TabsContent value="documents" className="mt-0">
        <DocumentsTab patientId={patientId} />
      </TabsContent>

      <TabsContent value="billing" className="mt-0">
        <BillingTab patientId={patientId} />
      </TabsContent>
    </Tabs>
  );
}
