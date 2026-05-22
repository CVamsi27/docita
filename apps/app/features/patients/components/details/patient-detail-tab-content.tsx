"use client";

import dynamic from "next/dynamic";
import type {
  Appointment,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientDetailTabLoadingShell } from "@/features/patients/components/details/patient-detail-tab-loading-shell";
import type { PatientStatistics } from "@/hooks/use-patient-data";
import type {
  PatientDetailTabValue,
  PatientRecordsSubTab,
} from "./patient-detail-tabs-config";

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

export function PatientDetailTabContent({
  activeTab,
  activeRecordsSubTab,
  patient,
  patientId,
  appointments,
  statistics,
  canEditPatient,
  canRecordPatientVitals,
  canViewInvoices,
  onSelectTab,
  onNavigateToRecordsSubTab,
  onScheduleVisit,
}: {
  activeTab: PatientDetailTabValue;
  activeRecordsSubTab: PatientRecordsSubTab;
  patient: PatientWithMedicalHistory;
  patientId: string;
  appointments: Appointment[];
  statistics: PatientStatistics | null;
  canEditPatient: boolean;
  canRecordPatientVitals: boolean;
  canViewInvoices: boolean;
  onSelectTab: (tab: string) => void;
  onNavigateToRecordsSubTab: (subtab: string) => void;
  onScheduleVisit: () => void;
}) {
  if (activeTab === "overview") {
    return (
      <OverviewTab
        appointments={appointments}
        statistics={statistics}
        onSelectTab={onSelectTab}
        onNavigateToRecordsSubTab={onNavigateToRecordsSubTab}
        onScheduleVisit={onScheduleVisit}
      />
    );
  }

  if (activeTab === "visits") {
    return <VisitsTab patientId={patientId} />;
  }

  if (activeTab === "records") {
    return (
      <>
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
      </>
    );
  }

  if (activeTab === "billing" && canViewInvoices) {
    return <BillingTab patientId={patientId} />;
  }

  return null;
}
