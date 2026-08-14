import { type ReactNode } from "react";
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
