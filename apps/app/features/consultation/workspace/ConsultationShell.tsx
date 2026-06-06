"use client";

import { useMemo, type RefObject } from "react";
import {
  type Appointment,
  type PatientWithMedicalHistory,
} from "@workspace/types";
import { resolveClinicTypeFeatures } from "@/features/consultation/lib/resolve-clinic-type-features";
import { CommandPalette } from "@/features/consultation/workspace/chrome/CommandPalette";
import { ConsultationWorkspaceProvider } from "@/features/consultation/workspace/consultation-workspace-context";
import { useConsultationShell } from "@/features/consultation/workspace/shell/use-consultation-shell";
import { ConsultationLeftRail } from "@/features/consultation/workspace/shell/ConsultationLeftRail";
import { ConsultationMainPanel } from "@/features/consultation/workspace/shell/ConsultationMainPanel";
import { ConsultationRightRail } from "@/features/consultation/workspace/shell/ConsultationRightRail";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";

interface ConsultationShellProps {
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
  clinicType?: string;
  readOnly?: boolean;
  isSidebarOpen?: boolean;
  saveHandlesRef?: RefObject<ConsultationSaveHandles | null>;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
}

export function ConsultationShell({
  appointmentData,
  clinicType,
  readOnly,
  isSidebarOpen = true,
  saveHandlesRef,
  paletteOpen,
  onPaletteOpenChange,
}: ConsultationShellProps) {
  const {
    sections,
    activeSectionId,
    selectSection,
    mainScrollRef,
    setSectionRef,
    effectivePatient,
    patientLoading,
    paletteActions,
  } = useConsultationShell({
    appointmentData,
    clinicType,
    readOnly,
    saveHandlesRef,
    paletteOpen,
    onPaletteOpenChange,
  });
  const clinicFeatures = useMemo(
    () => resolveClinicTypeFeatures(clinicType).features,
    [clinicType],
  );
  return (
    <ConsultationWorkspaceProvider
      clinicFeatures={clinicFeatures}
      sections={sections}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ConsultationLeftRail
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={selectSection}
        />
        <ConsultationMainPanel
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={selectSection}
          mainScrollRef={mainScrollRef}
          setSectionRef={setSectionRef}
          readOnly={readOnly}
          effectivePatient={effectivePatient}
          patientLoading={patientLoading}
          appointmentData={appointmentData}
        />
        <ConsultationRightRail
          isSidebarOpen={isSidebarOpen}
          appointmentData={appointmentData}
        />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={onPaletteOpenChange}
          actions={paletteActions}
        />
      </div>
    </ConsultationWorkspaceProvider>
  );
}
