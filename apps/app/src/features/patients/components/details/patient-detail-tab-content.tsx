import { lazy, Suspense } from "react";
import type {
  AppointmentListItemContractResponse,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientDetailTabLoadingShell } from "@/features/patients/components/details/patient-detail-tab-loading-shell";
import type {
  PatientDetailTabValue,
  PatientRecordsSubTab,
} from "./patient-detail-tabs-config";

const VisitsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/VisitsTab").then(
    (m) => ({ default: m.VisitsTab }),
  ),
);

const SummaryTab = lazy(() =>
  import("@/features/patients/components/details/tabs/SummaryTab").then(
    (m) => ({ default: m.SummaryTab }),
  ),
);

const RecordsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/RecordsTab").then(
    (m) => ({ default: m.RecordsTab }),
  ),
);

const PrescriptionsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/PrescriptionsTab").then(
    (m) => ({ default: m.PrescriptionsTab }),
  ),
);

const VitalsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/VitalsTab").then(
    (m) => ({ default: m.VitalsTab }),
  ),
);

const LabsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/LabsTab").then(
    (m) => ({ default: m.LabsTab }),
  ),
);

const DocumentsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/DocumentsTab").then(
    (m) => ({ default: m.DocumentsTab }),
  ),
);

const ReferralsTab = lazy(() =>
  import("@/features/patients/components/details/tabs/ReferralsTab").then(
    (m) => ({ default: m.ReferralsTab }),
  ),
);

const BillingTab = lazy(() =>
  import("@/features/patients/components/details/tabs/BillingTab").then(
    (m) => ({ default: m.BillingTab }),
  ),
);

const PatientCommunicationTab = lazy(() =>
  import("@/features/patients/components/details/PatientCommunicationTab").then(
    (m) => ({ default: m.PatientCommunicationTab }),
  ),
);

function TabSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PatientDetailTabLoadingShell />}>{children}</Suspense>;
}

export function PatientDetailTabContent({
  activeTab,
  activeRecordsSubTab,
  patient,
  patientId,
  appointments,
  canEditPatient,
  canRecordPatientVitals,
  canViewInvoices,
}: {
  activeTab: PatientDetailTabValue;
  activeRecordsSubTab: PatientRecordsSubTab;
  patient: PatientWithMedicalHistory;
  patientId: string;
  appointments: AppointmentListItemContractResponse[];
  canEditPatient: boolean;
  canRecordPatientVitals: boolean;
  canViewInvoices: boolean;
}) {
  if (activeTab === "summary") {
    return (
      <TabSuspense>
        <SummaryTab patient={patient} patientId={patientId} />
      </TabSuspense>
    );
  }
  if (activeTab === "visits") {
    return (
      <TabSuspense>
        <VisitsTab patientId={patientId} />
      </TabSuspense>
    );
  }
  if (activeTab === "records") {
    return (
      <TabSuspense>
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
        {activeRecordsSubTab === "referrals" && (
          <ReferralsTab patientId={patientId} />
        )}
      </TabSuspense>
    );
  }
  if (activeTab === "billing" && canViewInvoices) {
    return (
      <TabSuspense>
        <BillingTab patientId={patientId} />
      </TabSuspense>
    );
  }
  if (activeTab === "communication") {
    return (
      <TabSuspense>
        <PatientCommunicationTab patient={patient} patientId={patientId} />
      </TabSuspense>
    );
  }
  return null;
}
