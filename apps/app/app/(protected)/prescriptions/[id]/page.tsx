"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { LoadingState, EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { FileX } from "lucide-react";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { usePrescription } from "@/hooks/api/use-clinical";
import { queryKeys, useResendPrescriptionWhatsApp } from "@workspace/data-access";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useAuth } from "@/lib/auth/auth-context";
import { canCreatePrescription } from "@/lib/auth/permissions";
import { Feature } from "@workspace/types";
import { PrescriptionHeader } from "@/features/prescriptions/components/view/PrescriptionHeader";
import { PrescriptionDocument } from "@/features/prescriptions/components/view/PrescriptionDocument";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { FeatureGate } from "@/components/auth/feature-gate";
import { toast } from "sonner";

interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
}

export default function PrescriptionViewPage() {
  return (
    <FeatureGate feature={Feature.DIGITAL_PRESCRIPTIONS} showLockedCard>
      <PrescriptionViewPageContent />
    </FeatureGate>
  );
}

function PrescriptionViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";
  const hasAutoPrinted = useRef(false);
  const prescriptionId = params["id"] as string;
  const { clinic: contextClinic } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const goBack = useBackNavigation("/prescriptions");

  const {
    data: prescription,
    isLoading,
    error,
  } = usePrescription(prescriptionId);

  const resendWhatsApp = useResendPrescriptionWhatsApp(prescriptionId);

  const handleWhatsappRetry = async () => {
    try {
      await resendWhatsApp.mutateAsync();
      toast.success("Prescription re-sent on WhatsApp");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.prescriptions.detail(prescriptionId),
      });
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not resend the prescription. Please try again.",
        "save",
      );
    }
  };

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
          whatsappStatus={prescription.whatsappStatus ?? null}
          whatsappSentAt={prescription.whatsappSentAt ?? null}
          onWhatsappRetry={handleWhatsappRetry}
          isWhatsappRetrying={resendWhatsApp.isPending}
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
