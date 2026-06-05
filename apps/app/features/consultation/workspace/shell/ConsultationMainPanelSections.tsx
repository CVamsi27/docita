"use client";

import { type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
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
import type {
  ConsultationSection,
  ConsultationWorkspaceSectionId,
} from "@/features/consultation/workspace/consultation-section-registry";
import type { Appointment, PatientWithMedicalHistory } from "@workspace/types";

export function buildConsultationSectionComponents(
  setSectionRef: (id: string) => (el: HTMLElement | null) => void,
  readOnly: boolean | undefined,
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory },
  effectivePatient: PatientWithMedicalHistory | undefined,
): Partial<Record<ConsultationWorkspaceSectionId, ReactNode>> {
  return {
    subjective: (
      <SubjectiveSection
        key="subjective"
        sectionRef={setSectionRef("subjective")}
        readOnly={readOnly}
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
  };
}

interface StepProgressBarProps {
  activeIndex: number;
  sectionsLength: number;
  show: boolean;
}

export function StepProgressBar({
  activeIndex,
  sectionsLength,
  show,
}: StepProgressBarProps) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-3">
      <MicroLabel className="shrink-0 text-muted-foreground">
        Step {activeIndex + 1} of {sectionsLength}
      </MicroLabel>
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={activeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={sectionsLength}
        aria-label="Consultation step progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{
            width: `${((activeIndex + 1) / sectionsLength) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

interface StepNavigationProps {
  sections: ConsultationSection[];
  activeIndex: number;
  onSelectSection: (id: string) => void;
}

export function StepNavigation({
  sections,
  activeIndex,
  onSelectSection,
}: StepNavigationProps) {
  if (sections.length <= 1) return null;

  const prevSection = activeIndex > 0 ? sections[activeIndex - 1] : undefined;
  const nextSection =
    activeIndex < sections.length - 1 ? sections[activeIndex + 1] : undefined;

  return (
    <div className="flex items-center justify-between gap-3">
      {prevSection ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onSelectSection(prevSection.id)}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {prevSection.shortLabel}
          </span>
          <span className="sm:hidden">Back</span>
        </Button>
      ) : (
        <span />
      )}
      {nextSection ? (
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => onSelectSection(nextSection.id)}
        >
          <span className="hidden sm:inline">
            Next · {nextSection.shortLabel}
          </span>
          <span className="sm:hidden">Next</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Last step
        </span>
      )}
    </div>
  );
}
