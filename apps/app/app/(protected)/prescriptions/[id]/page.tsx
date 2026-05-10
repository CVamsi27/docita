"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { LoadingState, EmptyState } from "@workspace/ui/components/empty-state";
import { FileX } from "lucide-react";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { usePrescription } from "@/hooks/api/use-clinical";
import { useClinic } from "@/lib/clinic-context";
import { useAuth } from "@/lib/auth-context";
import { canCreatePrescription } from "@/lib/permissions";
import { PrescriptionHeader } from "@/features/prescriptions/components/view/PrescriptionHeader";
import { PrescriptionDocument } from "@/features/prescriptions/components/view/PrescriptionDocument";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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
  const { clinic: contextClinic } = useClinic();
  const { user } = useAuth();
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
    !!user?.role &&
    canCreatePrescription(user.role) &&
    !!prescription.appointmentId;

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-4xl">
      <div className="print:hidden">
        <PrescriptionHeader
          createdAt={new Date(prescription.createdAt).toISOString()}
          canEdit={canEdit}
          onBack={goBack}
          onEdit={handleEdit}
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
