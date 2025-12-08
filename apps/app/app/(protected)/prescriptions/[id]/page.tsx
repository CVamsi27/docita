"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { ArrowLeft, Printer, Share2, Edit, Loader2, Lock } from "lucide-react";
import { useSmartBack } from "@/hooks/use-smart-back";
import { format } from "date-fns";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { Medication } from "@workspace/types";
import Image from "next/image";

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

export default function PrescriptionViewPage() {
  const params = useParams();
  const router = useRouter();
  const prescriptionId = params.id as string;
  const { canAccess } = usePermissionStore();
  const { clinic: contextClinic } = useClinic();
  const hasWhatsAppAccess = canAccess(Feature.ONE_WAY_WHATSAPP);
  const goBack = useSmartBack("/patients");

  const {
    data: prescription,
    isLoading,
    error,
  } = apiHooks.usePrescription(prescriptionId);

  const handleEdit = () => {
    if (prescription?.appointmentId) {
      router.push(
        `/consultation/${prescription.appointmentId}?tab=prescription`,
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!prescription) return;

    const patientName = prescription.patient
      ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
      : "Patient";

    const doctorInfo = prescription.doctor as DoctorInfo;
    const doctorName = doctorInfo?.name || "Doctor";
    const date = format(new Date(prescription.createdAt), "dd/MM/yyyy");

    let message = `*Prescription for ${patientName}*\n\n`;
    message += `Date: ${date}\n`;
    message += `Doctor: Dr. ${doctorName}\n`;
    if (doctorInfo?.registrationNumber) {
      message += `Reg. No: ${doctorInfo.registrationNumber}\n`;
    }
    message += `\n*Rx*\n`;

    prescription.medications?.forEach((med: Medication, index: number) => {
      message += `${index + 1}. ${med.name}\n`;
      message += `   Dosage: ${med.dosage}\n`;
      message += `   Frequency: ${med.frequency}\n`;
      message += `   Duration: ${med.duration}\n\n`;
    });

    if (prescription.instructions) {
      message += `*Instructions:*\n${prescription.instructions}\n`;
    }

    const phoneNumber = prescription.patient?.phoneNumber?.replace(
      /[^0-9]/g,
      "",
    );
    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  if (error) {
    toast.error("Failed to load prescription");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Prescription not found</p>
        <Button onClick={() => router.push("/records")}>Back to Records</Button>
      </div>
    );
  }

  const patientName = prescription.patient
    ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
    : "Patient";

  const patientAge = prescription.patient?.dateOfBirth
    ? new Date().getFullYear() -
      new Date(prescription.patient.dateOfBirth).getFullYear()
    : null;

  const doctorInfo = prescription.doctor as DoctorInfo;
  const doctorName = doctorInfo?.name || "Doctor";

  // Get clinic info from prescription patient's clinic or from context
  const clinicInfo =
    (prescription.patient as { clinic?: ClinicInfo })?.clinic || contextClinic;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prescription</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(prescription.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {hasWhatsAppAccess ? (
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <Share2 className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to access WhatsApp sharing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Prescription Content - Print Optimized */}
      <Card className="print:shadow-none print:border-2 print:border-gray-300">
        <CardHeader className="space-y-4 pb-4">
          {/* Clinic Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-4">
            <div className="flex items-start gap-4">
              {clinicInfo?.logo && (
                <Image
                  src={clinicInfo.logo}
                  alt="Clinic Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {clinicInfo?.name || "Medical Clinic"}
                </h1>
                {clinicInfo?.address && (
                  <p className="text-sm text-muted-foreground">
                    {clinicInfo.address}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  {clinicInfo?.phone && <span>📞 {clinicInfo.phone}</span>}
                  {clinicInfo?.email && <span>✉️ {clinicInfo.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">Dr. {doctorName}</p>
              {doctorInfo?.qualification && (
                <p className="text-sm text-muted-foreground">
                  {doctorInfo.qualification}
                </p>
              )}
              {doctorInfo?.registrationNumber && (
                <p className="text-sm font-medium text-primary">
                  Reg. No: {doctorInfo.registrationNumber}
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
              {prescription.medications?.map(
                (med: Medication, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/30 rounded-lg print:bg-transparent print:border print:border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{med.name}</p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Dosage:{" "}
                            </span>
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
                ),
              )}
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
