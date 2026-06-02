"use client";

import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { StepProgress } from "@workspace/ui/components/navigation/step-progress";
import { Button } from "@workspace/ui/components/form/button";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface SectionRailProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  className?: string;
}

function findNextStep(
  sections: ConsultationSection[],
  completion: Record<string, boolean>,
): ConsultationSection | null {
  // Prefer the next required section that isn't complete.
  for (const s of sections) {
    if (s.required && !completion[s.id]) return s;
  }
  // Then any optional section that isn't complete.
  for (const s of sections) {
    if (!completion[s.id]) return s;
  }
  return null;
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
        !!treatment.trim() || prescriptions.length > 0 || !!followUpPlan.trim(),
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
  const requiredCount = sections.filter((s) => s.required).length;
  const requiredDoneCount = sections.filter(
    (s) => s.required && completion[s.id],
  ).length;
  const progressPct =
    requiredCount > 0
      ? Math.round((requiredDoneCount / requiredCount) * 100)
      : 0;
  const nextStep = findNextStep(sections, completion);

  return (
    <nav
      className={cn(
        "hidden md:flex flex-col items-stretch gap-1.5 border-r bg-muted/20 py-4 px-2",
        className,
      )}
      aria-label="Consultation sections"
    >
      {requiredCount > 0 ? (
        <div className="mb-2 rounded-[var(--radius-md)] border border-border/60 bg-background/70 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <MicroLabel className="text-muted-foreground">
              Required progress
            </MicroLabel>
            <span className="text-[var(--fs-2xs)] font-medium tabular-nums text-muted-foreground">
              {requiredDoneCount}/{requiredCount}
            </span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Required sections progress"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                progressPct === 100 ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSectionId;
        const isComplete = completion[section.id] ?? false;
        const needsAttention = (section.required ?? false) && !isComplete;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {/* Single status indicator: check when done, icon otherwise */}
            <span
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                isComplete
                  ? "border-transparent bg-success text-success-foreground"
                  : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {needsAttention ? (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-background bg-warning"
                  aria-label="Required"
                />
              ) : null}
            </span>
            <span className="flex flex-1 min-w-0 flex-col">
              <span
                className={cn(
                  "truncate text-sm leading-tight",
                  isActive ? "font-semibold text-foreground" : "font-medium",
                )}
              >
                {section.shortLabel}
              </span>
              {section.subtitle ? (
                <span className="truncate text-xs leading-snug text-muted-foreground">
                  {section.subtitle}
                </span>
              ) : null}
            </span>
            {/* Accessible status — visual cue is the check icon above */}
            <span className="sr-only">
              {isComplete ? "Started" : needsAttention ? "Required" : ""}
            </span>
          </button>
        );
      })}

      {nextStep && nextStep.id !== activeSectionId ? (
        <button
          type="button"
          onClick={() => onSelect(nextStep.id)}
          aria-label="Jump to next step"
          data-testid={`consultation-next-step-${nextStep.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 px-2.5 py-2 text-left transition-colors duration-150 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 flex-col" aria-hidden="true">
            <MicroLabel className="text-primary">Next step</MicroLabel>
            <span className="text-sm font-medium leading-tight text-foreground truncate">
              {nextStep.shortLabel}
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
        </button>
      ) : null}
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
  const nextStep = findNextStep(sections, completion);

  const stepItems = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: section.shortLabel,
        done: completion[section.id] ?? false,
        optional: !section.required,
      })),
    [sections, completion],
  );

  return (
    <div className="md:hidden sticky top-0 z-10 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <StepProgress
        items={stepItems}
        activeId={activeSectionId}
        onSelect={onSelect}
        ariaLabel="Consultation sections"
        compact
        trailing={
          nextStep && nextStep.id !== activeSectionId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-primary"
              onClick={() => onSelect(nextStep.id)}
              data-testid={`consultation-next-step-${nextStep.id}`}
            >
              Next
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
