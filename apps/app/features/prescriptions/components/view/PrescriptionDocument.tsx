import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { format } from "date-fns";
import Image from "next/image";
import type { Medication, Patient } from "@workspace/types";

// Define local interfaces if not available in types package yet
interface DoctorInfo {
  name?: string;
  qualification?: string;
  registrationNumber?: string;
  signatureUrl?: string;
}

interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

interface PrescriptionData {
  createdAt: string | Date;
  doctor?: DoctorInfo;
  patient?: Patient;
  medications?: Medication[];
  instructions?: string;
}

interface PrescriptionDocumentProps {
  prescription: PrescriptionData; // Strict typing instead of any
  clinicInfo: ClinicInfo | undefined;
}

export function PrescriptionDocument({
  prescription,
  clinicInfo,
}: PrescriptionDocumentProps) {
  const doctorInfo = prescription.doctor as DoctorInfo;
  const doctorName = doctorInfo?.name || "Doctor";

  const patientName = prescription.patient
    ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
    : "Patient";

  const patientAge = prescription.patient?.dateOfBirth
    ? new Date().getFullYear() -
      new Date(prescription.patient.dateOfBirth).getFullYear()
    : null;

  return (
    <Card className="print:shadow-none print:border-2 print:border-gray-300">
      <CardHeader className="space-y-4 pb-4">
        {/* Clinic Header */}
        {/* Clinic Header */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-primary pb-6 gap-4">
          <div className="flex items-start gap-4 max-w-[70%]">
            {clinicInfo?.logo ? (
              <div className="item-start pt-1">
                <Image
                  src={clinicInfo.logo}
                  alt="Clinic Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain rounded-md"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-primary leading-tight">
                {clinicInfo?.name || "Medical Clinic"}
              </h1>
              {clinicInfo?.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {clinicInfo.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                {clinicInfo?.phone && (
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">📞</span> {clinicInfo.phone}
                  </span>
                )}
                {clinicInfo?.email && (
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">✉️</span> {clinicInfo.email}
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

        {/* Patient Info */}
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
                  Gender:{" "}
                  {prescription.patient.gender.charAt(0) +
                    prescription.patient.gender.slice(1).toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Date
            </p>
            <p className="font-semibold">
              {format(new Date(prescription.createdAt), "dd MMMM yyyy")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rx Symbol and Medications */}
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
                className="p-3 bg-muted/30 rounded-lg print:bg-transparent print:border print:border-gray-200"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-primary">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="font-semibold text-base">{med.name}</p>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-sm">
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

        {/* Instructions */}
        {prescription.instructions && (
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span>📋</span> Instructions
            </h3>
            <p className="text-sm bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg whitespace-pre-wrap border border-yellow-200 dark:border-yellow-800 print:bg-yellow-50 print:border-yellow-300">
              {prescription.instructions}
            </p>
          </div>
        )}

        {/* Signature Section */}
        <div className="pt-8 mt-8 border-t">
          <div className="flex justify-end">
            <div className="text-center min-w-[200px]">
              {doctorInfo?.signatureUrl ? (
                <div className="mb-2">
                  <Image
                    src={doctorInfo.signatureUrl}
                    alt="Doctor's Signature"
                    width={150}
                    height={60}
                    className="h-[60px] w-auto mx-auto object-contain"
                  />
                </div>
              ) : (
                <div className="h-[60px] border-b-2 border-gray-400 mb-2" />
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

        {/* Footer */}
        <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
          <p className="font-medium">
            This is a digitally generated prescription
          </p>
          <p>
            Valid for dispensing within 30 days from the date of issue unless
            otherwise specified
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
