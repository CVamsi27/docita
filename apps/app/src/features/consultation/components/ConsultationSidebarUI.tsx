import { type FC, useState } from "react";
import { Appointment, Patient as BasePatient, PatientFamilyHistory, PatientSnapshot, PatientSocialHistory, PatientSurgicalHistory, PatientTimelineResponse } from "@workspace/types";
import { PatientSnapshotStrip } from "@/components/patient-history/PatientSnapshotStrip";
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";
import { FollowUpWidget } from "./FollowUpWidget";
import { ConsultationSidebarEmptyState, ConsultationSidebarHeader, ConsultationSidebarHistoryTimeline, ConsultationSidebarStructuredHistory } from "./consultation-sidebar-sections";

interface Patient extends BasePatient {
  age?: string;
  medicalConditions?: Array<{ id: string; conditionName: string }>;
}

interface AppointmentWrapper {
  appointment: Appointment;
  patient: Patient;
}

type AppointmentInput = AppointmentWrapper | Appointment;

function isAppointmentWrapper(
  data: AppointmentInput,
): data is AppointmentWrapper {
  return "appointment" in data;
}

function resolveSidebarPatientContext(rawData: AppointmentInput | undefined): {
  patient: Patient | undefined;
  appointmentId: string | undefined;
} {
  if (!rawData) return { patient: undefined, appointmentId: undefined };
  return isAppointmentWrapper(rawData)
    ? { patient: rawData.patient, appointmentId: rawData.appointment.id }
    : { patient: rawData.patient, appointmentId: rawData.id };
}

interface ConsultationSidebarProps {
  appointmentData?: AppointmentInput;
  appointment?: AppointmentInput;
  surgicalHistory?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  timelineData?: PatientTimelineResponse;
  snapshot?: PatientSnapshot;
  onClose?: () => void;
}

export const ConsultationSidebarUI: FC<ConsultationSidebarProps> = ({
  appointmentData,
  appointment,
  surgicalHistory = [],
  familyHistory = [],
  timelineData,
  snapshot,
  onClose,
}) => {
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const rawData = appointmentData ?? appointment;
  const { patient, appointmentId } = resolveSidebarPatientContext(rawData);

  if (!patient) return <ConsultationSidebarEmptyState />;

  const patientName = getPatientFullName(patient);
  const initials = getInitials(patient.firstName ?? "", patient.lastName);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-background">
      <ConsultationSidebarHeader
        initials={initials}
        patientName={patientName}
        age={patient.age}
        gender={patient.gender}
        mrn={patient.mrn}
        onClose={onClose}
      />

      {snapshot && (
        <PatientSnapshotStrip snapshot={snapshot} layout="vertical" />
      )}

      {timelineData && (
        <ConsultationSidebarHistoryTimeline
          timelineData={timelineData}
          open={timelineOpen}
          onOpenChange={setTimelineOpen}
        />
      )}

      {appointmentId ? <FollowUpWidget appointmentId={appointmentId} /> : null}

      {(surgicalHistory.length > 0 || familyHistory.length > 0) && (
        <ConsultationSidebarStructuredHistory
          surgicalHistory={surgicalHistory}
          familyHistory={familyHistory}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
    </div>
  );
};
