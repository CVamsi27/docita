import { Card, CardContent, CardHeader } from "@workspace/ui/components/indicators/card";
import { getPatientFullName } from "@workspace/utils";
import type { Medication, Patient } from "@workspace/types";
import { PrescriptionDocumentHeader } from "./PrescriptionDocumentHeader";
import { PrescriptionMedicationList } from "./PrescriptionMedicationList";
import { PrescriptionDocumentFooter } from "./PrescriptionDocumentFooter";

interface DoctorInfo {
  name?: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  signatureUrl?: string | null;
}

interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
}

interface PrescriptionData {
  createdAt: string | Date;
  doctor?: DoctorInfo;
  patient?: Patient;
  medications?: Medication[];
  instructions?: string;
}

interface PrescriptionDocumentProps {
  prescription: PrescriptionData;
  clinicInfo: ClinicInfo | undefined;
}

export function PrescriptionDocument({
  prescription,
  clinicInfo,
}: PrescriptionDocumentProps) {
  const doctorInfo = prescription.doctor;
  const doctorName = doctorInfo?.name ?? "";

  const patientName = prescription.patient
    ? getPatientFullName(prescription.patient)
    : "Patient";

  const patientAge = prescription.patient?.dateOfBirth
    ? new Date().getFullYear() -
      new Date(prescription.patient.dateOfBirth).getFullYear()
    : null;

  return (
    <Card className="print:shadow-none print:border-2 print:border-muted-foreground/30">
      <CardHeader className="space-y-4 pb-4">
        <PrescriptionDocumentHeader
          clinicInfo={clinicInfo}
          doctorInfo={doctorInfo}
          doctorName={doctorName}
          patientName={patientName}
          patientAge={patientAge}
          gender={prescription.patient?.gender}
          createdAt={prescription.createdAt}
        />
      </CardHeader>

      <CardContent className="space-y-6">
        <PrescriptionMedicationList
          medications={prescription.medications}
          instructions={prescription.instructions}
        />

        <PrescriptionDocumentFooter
          doctorInfo={doctorInfo}
          doctorName={doctorName}
        />
      </CardContent>
    </Card>
  );
}
