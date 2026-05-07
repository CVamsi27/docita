"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface SectionRailProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  className?: string;
}

function specialtyJsonFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== "object") return false;
  const s = JSON.stringify(value);
  return s.length > 2 && s !== "{}" && s !== "[]";
}

function useSectionCompletion() {
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const examination = useConsultationDraft((s) => s.examination);
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const treatment = useConsultationDraft((s) => s.treatment);
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const followUpPlan = useConsultationDraft((s) => s.followUpPlan);
  const dentalChart = useConsultationDraft((s) => s.dentalChart);
  const eyeExam = useConsultationDraft((s) => s.eyeExam);
  const growthData = useConsultationDraft((s) => s.growthData);
  const cardiologyExam = useConsultationDraft((s) => s.cardiologyExam);
  const dermatologyExam = useConsultationDraft((s) => s.dermatologyExam);
  const gynecologyExam = useConsultationDraft((s) => s.gynecologyExam);
  const psychiatryExam = useConsultationDraft((s) => s.psychiatryExam);
  const investigations = useConsultationDraft((s) => s.investigations);

  return useMemo(() => {
    const examComplete =
      !!examination.general.notes?.trim() ||
      examination.general.pallor ||
      examination.general.icterus ||
      examination.general.cyanosis ||
      examination.general.clubbing ||
      examination.general.lymphadenopathy ||
      examination.general.edema ||
      !!examination.systemic.cvs?.trim() ||
      !!examination.systemic.rs?.trim() ||
      !!examination.systemic.pa?.trim() ||
      !!examination.systemic.cns?.trim() ||
      !!examination.systemic.musculoskeletal?.trim() ||
      !!examination.systemic.notes?.trim();

    const map: Record<string, boolean> = {
      subjective:
        (chiefComplaint.length > 0 &&
          chiefComplaint.some((c) => c.complaint?.trim())) ||
        !!history.trim(),
      objective: examComplete,
      assessment:
        diagnosis.length > 0 &&
        diagnosis.some((d) => (d.condition?.trim().length ?? 0) > 0),
      plan:
        !!treatment.trim() ||
        prescriptions.length > 0 ||
        !!followUpPlan.trim(),
      "specialty-dental": Object.keys(dentalChart).length > 0,
      "specialty-vision": Object.keys(eyeExam).length > 0,
      "specialty-growth": (growthData?.measurements?.length ?? 0) > 0,
      "specialty-cardiology": specialtyJsonFilled(cardiologyExam),
      "specialty-dermatology": specialtyJsonFilled(dermatologyExam),
      "specialty-gynecology": specialtyJsonFilled(gynecologyExam),
      "specialty-psychiatry": specialtyJsonFilled(psychiatryExam),
      "specialty-investigations": investigations.length > 0,
    };
    return map;
  }, [
    chiefComplaint,
    history,
    examination,
    diagnosis,
    treatment,
    prescriptions,
    followUpPlan,
    dentalChart,
    eyeExam,
    growthData,
    cardiologyExam,
    dermatologyExam,
    gynecologyExam,
    psychiatryExam,
    investigations,
  ]);
}

export function SectionRail({
  sections,
  activeSectionId,
  onSelect,
  className,
}: SectionRailProps) {
  const completion = useSectionCompletion();

  return (
    <nav
      className={cn(
        "hidden md:flex flex-col items-stretch gap-1.5 border-r bg-muted/20 py-4 px-2",
        className,
      )}
      aria-label="Consultation sections"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSectionId;
        const isComplete = completion[section.id] ?? false;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex min-h-[4.5rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[var(--fs-2xs)] font-semibold",
                isActive
                  ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                  : isComplete
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-background text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {section.letter}
            </span>
            <span className="flex flex-1 flex-col min-w-0">
              <span className="text-sm font-medium leading-tight truncate">
                {section.shortLabel}
              </span>
              {section.subtitle ? (
                <span
                  className={cn(
                    "text-xs leading-snug truncate",
                    isActive
                      ? "text-primary-foreground/85"
                      : "text-muted-foreground",
                  )}
                >
                  {section.subtitle}
                </span>
              ) : null}
              {isComplete ? (
                <MicroLabel
                  className={cn(
                    "inline-flex items-center gap-1",
                    isActive ? "text-primary-foreground/80" : "text-success",
                  )}
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Started
                </MicroLabel>
              ) : null}
            </span>
            <Icon
              aria-hidden
              className={cn(
                "h-4 w-4 shrink-0",
                isActive
                  ? "text-primary-foreground/90"
                  : "text-muted-foreground/70",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

interface SectionTabsProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
}

export function SectionTabs({
  sections,
  activeSectionId,
  onSelect,
}: SectionTabsProps) {
  const completion = useSectionCompletion();
  return (
    <div
      className="md:hidden sticky top-[57px] z-10 flex flex-nowrap gap-0 overflow-x-auto overscroll-x-contain border-b bg-background/95 backdrop-blur [scrollbar-width:thin]"
      role="tablist"
      aria-label="Consultation sections"
    >
      {sections.map((section) => {
        const isActive = section.id === activeSectionId;
        const isComplete = completion[section.id] ?? false;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(section.id)}
            className={cn(
              "shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary text-primary"
                : isComplete
                  ? "border-transparent text-success"
                  : "border-transparent text-muted-foreground",
            )}
          >
            <span className="mr-1.5 text-[var(--fs-2xs)] font-bold">
              {section.letter}
            </span>
            {section.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
