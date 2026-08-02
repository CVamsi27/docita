import { MicroLabel, PageTabs } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";
import type {
  AppointmentListItemContractResponse,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientTagManagerContainer as PatientTagManager } from "@/features/patients/components/details/PatientTagManagerContainer";
import { PatientClinicalChartSummary } from "./patient-clinical-chart-summary";
import { PatientDetailTabContent } from "./patient-detail-tab-content";
import { usePatientDetailTabs } from "./use-patient-detail-tabs";

export {
  PATIENT_DETAIL_TAB_VALUES,
  PATIENT_RECORDS_SUB_TABS,
  LEGACY_PATIENT_TAB_REDIRECTS,
  type PatientDetailTabValue,
  type PatientRecordsSubTab,
} from "./patient-detail-tabs-config";

interface PatientDetailTabsProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
  appointments: AppointmentListItemContractResponse[];
  canEditPatient: boolean;
  canRecordPatientVitals: boolean;
}

export function PatientDetailTabs({
  patient,
  patientId,
  appointments,
  canEditPatient,
  canRecordPatientVitals,
}: PatientDetailTabsProps) {
  const { t } = useTranslation("Patients.tabs");
  const tabs = usePatientDetailTabs();
  return (
    <div role="region" aria-label={t("patientDetailAria")} className="w-full">
      <PatientClinicalChartSummary patientId={patientId} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2" data-testid="patient-detail-tab-bar">
          <MicroLabel className="px-1">{t("sections")}</MicroLabel>
          <PageTabs
            items={tabs.items}
            activeId={tabs.activeTab}
            onSelect={tabs.handleSelectTab}
            ariaLabel={t("patientSectionsAria")}
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <PatientTagManager patientId={patientId} />
        </div>
      </div>
      {tabs.activeTab === "records" ? (
        <div className="space-y-4" data-testid="patient-records-subtabs">
          <PageTabs
            items={tabs.recordsSubItems}
            activeId={tabs.activeRecordsSubTab}
            onSelect={tabs.handleSelectRecordsSubTab}
            ariaLabel={t("recordsSubSectionsAria")}
          />
          <PatientDetailTabContent
            activeTab={tabs.activeTab}
            activeRecordsSubTab={tabs.activeRecordsSubTab}
            patient={patient}
            patientId={patientId}
            appointments={appointments}
            canEditPatient={canEditPatient}
            canRecordPatientVitals={canRecordPatientVitals}
            canViewInvoices={tabs.canViewInvoices}
          />
        </div>
      ) : (
        <PatientDetailTabContent
          activeTab={tabs.activeTab}
          activeRecordsSubTab={tabs.activeRecordsSubTab}
          patient={patient}
          patientId={patientId}
          appointments={appointments}
          canEditPatient={canEditPatient}
          canRecordPatientVitals={canRecordPatientVitals}
          canViewInvoices={tabs.canViewInvoices}
        />
      )}
    </div>
  );
}
