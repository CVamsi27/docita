"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { LoadingState, EmptyState } from "@workspace/ui/components/empty-state";
import { FileX } from "lucide-react";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { usePrescription } from "@/hooks/api/use-clinical";
import { useResendPrescriptionWhatsApp } from "@/hooks/api/use-whatsapp";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useAuth } from "@/lib/auth/auth-context";
import { canCreatePrescription } from "@/lib/auth/permissions";
import { Feature } from "@workspace/types";
import { PrescriptionHeader } from "@/features/prescriptions/components/view/PrescriptionHeader";
import { PrescriptionDocument } from "@/features/prescriptions/components/view/PrescriptionDocument";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
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
  return <PrescriptionViewPageContent />;
}
