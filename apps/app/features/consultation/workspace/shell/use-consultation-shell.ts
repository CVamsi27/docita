import { useCallback, useEffect, useMemo, type RefObject } from "react";
import { useParams } from "next/navigation";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { useConsultationHydrate } from "@/features/consultation/state/useConsultationHydrate";
import { useConsultationAutosave } from "@/features/consultation/state/useConsultationAutosave";
import { usePatientWithMedicalHistory } from "@workspace/data-access";
import { getConsultationSectionsForClinic } from "@/features/consultation/workspace/consultation-section-registry";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";
import {
  CLINIC_TYPE_FEATURES,
  clinicTypeSchema,
  type Appointment,
  type PatientWithMedicalHistory,
} from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useConsultationShellScroll } from "./use-consultation-shell-scroll";
import { useConsultationShellChrome } from "./use-consultation-shell-chrome";

export interface UseConsultationShellOptions {
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
  clinicType?: string;
  readOnly?: boolean;
  saveHandlesRef?: RefObject<ConsultationSaveHandles | null>;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
}

export function useConsultationShell({
  appointmentData,
  clinicType,
  readOnly,
  saveHandlesRef,
  paletteOpen,
  onPaletteOpenChange,
}: UseConsultationShellOptions) {
  const params = useParams();
  const appointmentId = typeof params?.["id"] === "string" ? params["id"] : "";
  const { openVitals } = useConsultationVitals();
  const { canViewPrescriptions, canManageTemplates } = usePermissions();
  const { canAccess } = usePermissionStore();
  const patientLinkId = appointmentData.patientId ?? "";

  useConsultationHydrate({
    appointmentId,
    appointmentData,
  });

  const sections = useMemo(
    () => getConsultationSectionsForClinic(clinicType),
    [clinicType],
  );

  const clinicFeatures = useMemo(() => {
    const normalized = clinicType?.toUpperCase() ?? "GENERAL";
    const parsed = parseStringEnumMember(clinicTypeSchema.options, normalized);
    if (parsed) {
      return CLINIC_TYPE_FEATURES[parsed];
    }
    return CLINIC_TYPE_FEATURES.GENERAL;
  }, [clinicType]);

  const { data: patient, isLoading: patientLoading } =
    usePatientWithMedicalHistory(appointmentData.patientId ?? "");

  const effectivePatient = patient ?? appointmentData.patient;

  const scroll = useConsultationShellScroll({ sections, clinicType });

  const { flush, submitPrescriptions } = useConsultationAutosave({
    appointmentId,
    readOnly,
    clinicType,
    patientId: appointmentData.patientId,
  });

  useEffect(() => {
    if (!saveHandlesRef) return;
    saveHandlesRef.current = { flush, submitPrescriptions };
    return () => {
      saveHandlesRef.current = null;
    };
  }, [flush, saveHandlesRef, submitPrescriptions]);

  void useConsultationDraft((s) => s.dirty);
  void useConsultationDraft((s) => s.saveState);

  const onSaveClick = useCallback(async () => {
    await flush({ force: true });
    await submitPrescriptions();
  }, [flush, submitPrescriptions]);

  const { paletteActions } = useConsultationShellChrome({
    sections,
    selectSection: scroll.selectSection,
    focusNewItem: scroll.focusNewItem,
    letterNavMap: scroll.letterNavMap,
    readOnly,
    paletteOpen,
    onPaletteOpenChange,
    patientLinkId,
    canViewPrescriptions,
    canManageTemplates,
    canAccess,
    openVitals,
    onSaveClick,
  });

  return {
    sections,
    clinicFeatures,
    activeSectionId: scroll.activeSectionId,
    selectSection: scroll.selectSection,
    mainScrollRef: scroll.mainScrollRef,
    setSectionRef: scroll.setSectionRef,
    effectivePatient,
    patientLoading,
    paletteActions,
  };
}
