"use client";

import { useMemo, type RefObject } from "react";
import { SectionTabs } from "@/features/consultation/workspace/chrome/SectionRail";
import { ConsultationAfterVisitStrip } from "@/features/consultation/components/ConsultationWorkspaceExtras";
import { ConsultationPastHistoryCard } from "@/features/consultation/components/ConsultationPastHistoryCard";
import {
  buildConsultationSectionComponents,
  StepProgressBar,
  StepNavigation,
} from "./ConsultationMainPanelSections";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
import type { Appointment, PatientWithMedicalHistory } from "@workspace/types";

interface ConsultationMainPanelProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  mainScrollRef: RefObject<HTMLElement | null>;
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
  readOnly?: boolean;
  effectivePatient?: PatientWithMedicalHistory;
  patientLoading?: boolean;
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
}

export function ConsultationMainPanel({
  sections,
  activeSectionId,
  onSelectSection,
  mainScrollRef,
  setSectionRef,
  readOnly,
  effectivePatient,
  patientLoading,
  appointmentData,
}: ConsultationMainPanelProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sectionComponents = useMemo(
    () =>
      buildConsultationSectionComponents(
        setSectionRef,
        readOnly,
        appointmentData,
        effectivePatient,
      ),
    [
      appointmentData.patientId,
      appointmentData.id,
      appointmentData.doctorId,
      effectivePatient,
      readOnly,
      setSectionRef,
    ],
  );

  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === activeSectionId),
  );
  const activeSection = sections[activeIndex];
  const activeNode = activeSection
    ? sectionComponents[activeSection.id]
    : undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <SectionTabs
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={onSelectSection}
      />

      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto bg-muted/40 px-3 py-4 md:px-6 md:py-6"
        aria-label="Consultation workspace"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <ConsultationPastHistoryCard
            patient={effectivePatient}
            patientLoading={patientLoading}
            readOnly={readOnly}
          />

          <StepProgressBar
            activeIndex={activeIndex}
            sectionsLength={sections.length}
            show={Boolean(activeSection)}
          />

          {activeNode}

          <StepNavigation
            sections={sections}
            activeIndex={activeIndex}
            onSelectSection={onSelectSection}
          />

          <ConsultationAfterVisitStrip
            appointment={appointmentData}
            onGoToPlan={() => onSelectSection("plan")}
          />
        </div>
      </main>
    </div>
  );
}
