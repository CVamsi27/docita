"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { LoadingState, EmptyState } from "@workspace/ui/components/empty-state";
import { FileX } from "lucide-react";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { DATE_FORMATS, formatDate } from "@workspace/utils";
import { usePrescription } from "@/hooks/api/use-clinical";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useClinic } from "@/lib/clinic-context";
import { useAuth } from "@/lib/auth-context";
import type { Medication } from "@workspace/types";
import { PrescriptionHeader } from "@/features/prescriptions/components/view/PrescriptionHeader";
import { PrescriptionDocument } from "@/features/prescriptions/components/view/PrescriptionDocument";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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
  logo?: string | null;
}

export default function PrescriptionViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";
  const hasAutoPrinted = useRef(false);
  const prescriptionId = params["id"] as string;
  const { canAccess } = useFeatureAccess();
  const { clinic: contextClinic } = useClinic();
  const { user } = useAuth();
  const hasWhatsAppAccess = canAccess("WHATSAPP_MESSAGING"); 
  const goBack = useBackNavigation("/prescriptions");

  const {
    data: prescription,
    isLoading,
    error,
  } = usePrescription(prescriptionId);

  useEffect(() => {
    if (shouldAutoPrint && prescription && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [shouldAutoPrint, prescription]);

  const handleEdit = () => {
    if (prescription?.appointmentId) {
      router.push(
        buildConsultationRoute(prescription.appointmentId, {
          tab: "treatment",
          from: "prescription",
        }),
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
    const doctorName = doctorInfo?.name?.trim() ?? "";
    const date = formatDate(prescription.createdAt, DATE_FORMATS.DATE_SHORT);

    let message = `*Prescription for ${patientName}*\n\n`;
    message += `Date: ${date}\n`;
    if (doctorName) {
      message += `Doctor: Dr. ${doctorName}\n`;
    }
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
    showUserFacingErrorToast(
      "We could not load this prescription. Please try again.",
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading prescription…" className="min-h-[50vh]" />;
  }

  if (!prescription) {
    return (
      <EmptyState
        icon={FileX}
        title="Prescription not found"
        description="The prescription you are looking for is unavailable."
        action={{
          label: "Back to Prescriptions",
          onClick: () => router.push("/prescriptions"),
        }}
        className="min-h-[50vh]"
      />
    );
  }

  const clinicInfo =
    (prescription.patient as { clinic?: ClinicInfo })?.clinic ||
    contextClinic ||
    undefined;

  const canEdit =
    !(user?.role && ["ADMIN", "RECEPTIONIST"].includes(user.role)) &&
    !!prescription.appointmentId;

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-4xl">
      <div className="print:hidden">
        <PrescriptionHeader
          createdAt={new Date(prescription.createdAt).toISOString()}
          canEdit={canEdit}
          hasWhatsAppAccess={hasWhatsAppAccess}
          onBack={goBack}
          onEdit={handleEdit}
          onShareWhatsApp={handleShareWhatsApp}
          onPrint={handlePrint}
        />
      </div>

      <PrintSheet paperSize="a4" hidePrintButton>
        <PrescriptionDocument
          prescription={prescription}
          clinicInfo={clinicInfo}
        />
      </PrintSheet>
    </div>
  );
}
