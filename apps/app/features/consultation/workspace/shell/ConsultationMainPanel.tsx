"use client";

import { useMemo, type ReactNode, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { SectionTabs } from "@/features/consultation/workspace/chrome/SectionRail";
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
import { ConsultationPastHistoryCard } from "@/features/consultation/components/ConsultationPastHistoryCard";
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
      readOnly,
      setSectionRef,
    ],
  );

  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === activeSectionId),
  );
  const activeSection = sections[activeIndex];
  const prevSection = activeIndex > 0 ? sections[activeIndex - 1] : undefined;
  const nextSection =
    activeIndex < sections.length - 1 ? sections[activeIndex + 1] : undefined;
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
          {/* Pinned: patient history stays on top across every step. */}
          <ConsultationPastHistoryCard
            patient={effectivePatient}
            patientLoading={patientLoading}
            readOnly={readOnly}
          />

          {activeSection ? (
            <div className="flex items-center justify-between gap-3">
              <MicroLabel className="text-muted-foreground">
                Step {activeIndex + 1} of {sections.length}
              </MicroLabel>
              <span className="text-xs font-medium text-muted-foreground">
                {activeSection.label}
              </span>
            </div>
          ) : null}

          {/* Active step only — one section at a time. */}
          {activeNode}

          {/* Step navigation. */}
          {sections.length > 1 ? (
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
          ) : null}

          {/* Pinned: after-visit actions stay at the bottom across every step. */}
          <ConsultationAfterVisitStrip
            appointment={appointmentData}
            onGoToPlan={() => onSelectSection("plan")}
          />
        </div>
      </main>
    </div>
  );
}
