"use client";

import { useMemo, type ReactNode, type RefObject } from "react";
import { SectionTabs } from "@/features/consultation/workspace/chrome/SectionRail";
import { cn } from "@workspace/ui/lib/utils";
import {
  AssessmentSection,
  CardiologyExamSection,
  DentalSpecialtySection,
  DermatologyExamSection,
  GrowthSpecialtySection,
  GynecologyExamSection,
  InvestigationsSection,
  ObjectiveSection,
  PlanSection,
  PsychiatryExamSection,
  SubjectiveSection,
  VisionSpecialtySection,
} from "@/features/consultation/workspace/sections";
import { ConsultationAfterVisitStrip } from "@/features/consultation/components/ConsultationWorkspaceExtras";
import type {
  ConsultationSection,
  ConsultationWorkspaceSectionId,
} from "@/features/consultation/workspace/consultation-section-registry";
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
  const sectionComponents = useMemo(
    (): Partial<Record<ConsultationWorkspaceSectionId, ReactNode>> => ({
      subjective: (
        <SubjectiveSection
          key="subjective"
          sectionRef={setSectionRef("subjective")}
          readOnly={readOnly}
          patient={effectivePatient}
          patientLoading={patientLoading}
        />
      ),
      objective: (
        <ObjectiveSection
          key="objective"
          sectionRef={setSectionRef("objective")}
          readOnly={readOnly}
        />
      ),
      "specialty-dental": (
        <DentalSpecialtySection
          key="specialty-dental"
          sectionRef={setSectionRef("specialty-dental")}
          readOnly={readOnly}
        />
      ),
      "specialty-vision": (
        <VisionSpecialtySection
          key="specialty-vision"
          sectionRef={setSectionRef("specialty-vision")}
          readOnly={readOnly}
        />
      ),
      "specialty-growth": (
        <GrowthSpecialtySection
          key="specialty-growth"
          sectionRef={setSectionRef("specialty-growth")}
          readOnly={readOnly}
        />
      ),
      "specialty-cardiology": (
        <CardiologyExamSection
          key="specialty-cardiology"
          sectionRef={setSectionRef("specialty-cardiology")}
          readOnly={readOnly}
        />
      ),
      "specialty-dermatology": (
        <DermatologyExamSection
          key="specialty-dermatology"
          sectionRef={setSectionRef("specialty-dermatology")}
          readOnly={readOnly}
        />
      ),
      "specialty-gynecology": (
        <GynecologyExamSection
          key="specialty-gynecology"
          sectionRef={setSectionRef("specialty-gynecology")}
          readOnly={readOnly}
        />
      ),
      "specialty-psychiatry": (
        <PsychiatryExamSection
          key="specialty-psychiatry"
          sectionRef={setSectionRef("specialty-psychiatry")}
          readOnly={readOnly}
        />
      ),
      "specialty-investigations": (
        <InvestigationsSection
          key="specialty-investigations"
          sectionRef={setSectionRef("specialty-investigations")}
          readOnly={readOnly}
          patientId={appointmentData.patientId}
          appointmentId={appointmentData.id}
          doctorId={appointmentData.doctorId}
        />
      ),
      assessment: (
        <AssessmentSection
          key="assessment"
          sectionRef={setSectionRef("assessment")}
          readOnly={readOnly}
        />
      ),
      plan: (
        <PlanSection
          key="plan"
          sectionRef={setSectionRef("plan")}
          readOnly={readOnly}
          patientAllergies={effectivePatient?.patientAllergies}
        />
      ),
    }),
    [
      appointmentData.patientId,
      appointmentData.id,
      appointmentData.doctorId,
      effectivePatient,
      patientLoading,
      readOnly,
      setSectionRef,
    ],
  );

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
          {sections.map((section) => {
            const Node = sectionComponents[section.id];
            if (!Node) return null;
            return (
              <div
                key={section.id}
                className={cn(
                  section.id !== activeSectionId && "hidden md:block",
                )}
              >
                {Node}
              </div>
            );
          })}
          <ConsultationAfterVisitStrip
            appointment={appointmentData}
            onGoToPlan={() => onSelectSection("plan")}
          />
        </div>
      </main>
    </div>
  );
}
