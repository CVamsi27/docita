"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import { useSmartBack } from "@/hooks/use-smart-back";
import { format } from "date-fns";
import { usePrescription } from "@/hooks/api/use-clinical";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useClinic } from "@/lib/clinic-context";
import { useAuth } from "@/lib/auth-context";
import type { Medication } from "@workspace/types";
import { PrescriptionHeader } from "@/features/prescriptions/components/view/PrescriptionHeader";
import { PrescriptionDocument } from "@/features/prescriptions/components/view/PrescriptionDocument";

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
  const prescriptionId = params["id"] as string;
  const { canAccess } = useFeatureAccess();
  const { clinic: contextClinic } = useClinic();
  const { user } = useAuth();
  const hasWhatsAppAccess = canAccess("WHATSAPP_MESSAGING"); // Add-on based
  const goBack = useSmartBack("/patients");

  const {
    data: prescription,
    isLoading,
    error,
  } = usePrescription(prescriptionId);

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

  // Get clinic info from prescription patient's clinic or from context
  const clinicInfo =
    (prescription.patient as { clinic?: ClinicInfo })?.clinic ||
    contextClinic ||
    undefined;

  const canEdit =
    !(user?.role && ["ADMIN", "RECEPTIONIST"].includes(user.role)) &&
    !!prescription.appointmentId;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PrescriptionHeader
        createdAt={new Date(prescription.createdAt).toISOString()}
        canEdit={canEdit}
        hasWhatsAppAccess={hasWhatsAppAccess}
        onBack={goBack}
        onEdit={handleEdit}
        onShareWhatsApp={handleShareWhatsApp}
        onPrint={handlePrint}
      />

      <PrescriptionDocument
        prescription={prescription}
        clinicInfo={clinicInfo}
      />

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
