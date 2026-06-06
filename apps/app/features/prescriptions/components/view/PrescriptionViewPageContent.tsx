"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileX } from "lucide-react";
import { toast } from "sonner";
import {
  queryKeys,
  useResendPrescriptionWhatsApp,
} from "@workspace/data-access";
import {
  LoadingState,
  EmptyState,
} from "@workspace/ui/components/feedback/empty-state";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { Feature } from "@workspace/types";
import { isRecord } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { usePrescription } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { canCreatePrescription } from "@/lib/auth/permissions";
import { useClinic } from "@/lib/contexts/clinic-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { buildConsultationRoute } from "@/features/consultation";
import { PrescriptionDocument } from "./PrescriptionDocument";
import { PrescriptionHeader } from "./PrescriptionHeader";

interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
}

function readClinicInfo(value: unknown): ClinicInfo | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    name: typeof value.name === "string" ? value.name : undefined,
    address: typeof value.address === "string" ? value.address : undefined,
    phone: typeof value.phone === "string" ? value.phone : undefined,
    email: typeof value.email === "string" ? value.email : undefined,
    logo:
      typeof value.logo === "string" || value.logo === null
        ? value.logo
        : undefined,
  };
}

export function PrescriptionViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";
  const hasAutoPrinted = useRef(false);
  const rawPrescriptionId = params["id"];
  const prescriptionId =
    typeof rawPrescriptionId === "string" ? rawPrescriptionId : "";
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

  if (isLoading) return (
      <LoadingState
        message="Loading prescription..."
        className="min-h-[50vh]"
      />
    );

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

  const patientClinic =
    prescription.patient &&
    typeof prescription.patient === "object" &&
    "clinic" in prescription.patient
      ? readClinicInfo(prescription.patient.clinic)
      : undefined;
  const clinicInfo = patientClinic ?? contextClinic ?? undefined;
  const canEdit =
    !!user?.role &&
    canCreatePrescription(user.role) &&
    !!prescription.appointmentId;

  return (
    <FeatureGate feature={Feature.DIGITAL_PRESCRIPTIONS} showLockedCard>
      <div className="flex flex-col gap-6 mx-auto w-full max-w-4xl">
        <div className="print:hidden">
          <PrescriptionHeader
            createdAt={new Date(prescription.createdAt).toISOString()}
            canEdit={canEdit}
            onBack={goBack}
            onEdit={handleEdit}
            onPrint={handlePrint}
            whatsappStatus={prescription.whatsappStatus}
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
    </FeatureGate>
  );
}
