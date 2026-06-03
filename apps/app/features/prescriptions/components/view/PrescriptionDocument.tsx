import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
import { formatDate, getPatientFullName } from "@workspace/utils";
import type { Medication, Patient } from "@workspace/types";
import { formatGenderLabel } from "@/lib/formatters";
import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";

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
        <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-primary pb-6 gap-4">
          <div className="flex items-start gap-4 max-w-[70%]">
            {clinicInfo?.logo ? (
              <div className="items-start pt-1">
                <img
                  src={clinicInfo.logo}
                  alt="Facility logo"
                  className="h-20 w-20 object-contain rounded-lg"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <h1 className="ui-page-title text-primary leading-[var(--lh-tight)]">
                {clinicInfo?.name ?? ""}
              </h1>
              {clinicInfo?.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {clinicInfo.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                {clinicInfo?.phone && (
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Phone:</span>{" "}
                    {clinicInfo.phone}
                  </span>
                )}
                {clinicInfo?.email && (
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Email:</span>{" "}
                    {clinicInfo.email}
                  </span>
                )}
                {!clinicInfo?.email && (
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Support:</span>{" "}
                    {SUPPORT_EMAIL}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0 bg-muted/20 p-3 rounded-lg md:bg-transparent md:p-0">
            <p className="font-bold text-lg text-primary">Dr. {doctorName}</p>
            {doctorInfo?.qualification && (
              <p className="text-sm text-muted-foreground font-medium">
                {doctorInfo.qualification}
              </p>
            )}
            {doctorInfo?.registrationNumber && (
              <p className="text-xs font-mono mt-1 text-primary/80">
                Reg: {doctorInfo.registrationNumber}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Patient Name
            </p>
            <p className="font-semibold text-lg">{patientName}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {patientAge && <span>Age: {patientAge} yrs</span>}
              {prescription.patient?.gender && (
                <span>
                  Gender: {formatGenderLabel(prescription.patient.gender)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Date
            </p>
            <p className="font-semibold">
              {formatDate(prescription.createdAt, "dd MMMM yyyy")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl font-serif font-bold text-primary italic">
              ℞
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              Medications
            </span>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            {prescription.medications?.map((med: Medication, index: number) => (
              <div
                key={index}
                className="p-3 bg-muted/30 rounded-lg print:bg-transparent print:border print:border-muted-foreground/20"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-primary">{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-base">{med.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-sm print:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Dosage: </span>
                        <span className="font-medium">{med.dosage}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Frequency:{" "}
                        </span>
                        <span className="font-medium">{med.frequency}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Duration:{" "}
                        </span>
                        <span className="font-medium">{med.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {prescription.instructions && (
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              Instructions
            </h3>
            <p className="text-sm surface-warning p-4 rounded-lg whitespace-pre-wrap print:bg-warning print:border-warning/30">
              {prescription.instructions}
            </p>
          </div>
        )}

        <div className="pt-8 mt-8 border-t">
          <div className="flex justify-end">
            <div className="text-center min-w-[200px]">
              {doctorInfo?.signatureUrl ? (
                <div className="mb-2">
                  <img
                    src={doctorInfo.signatureUrl}
                    alt="Doctor's Signature"
                    className="h-[60px] w-auto mx-auto object-contain"
                  />
                </div>
              ) : (
                <div className="h-[60px] border-b-2 border-muted-foreground/50 mb-2" />
              )}
              <p className="font-bold">Dr. {doctorName}</p>
              {doctorInfo?.qualification && (
                <p className="text-sm text-muted-foreground">
                  {doctorInfo.qualification}
                </p>
              )}
              {doctorInfo?.registrationNumber && (
                <p className="text-sm font-medium">
                  Reg. No: {doctorInfo.registrationNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
          <p className="font-medium">
            This is a digitally generated prescription
          </p>
          <p>Prescription support: {SUPPORT_EMAIL}</p>
          <p>
            Valid for dispensing within 30 days from the date of issue unless
            otherwise specified
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
