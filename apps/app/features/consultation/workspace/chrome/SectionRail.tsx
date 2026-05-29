"use client";

import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
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
        <div className="mb-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
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
                "h-full rounded-full transition-all",
                progressPct === 100 ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {sections.map((section, index) => {
        const Icon = section.icon;
        const isActive = section.id === activeSectionId;
        const isComplete = completion[section.id] ?? false;
        const isRequired = section.required ?? false;
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
                "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[var(--fs-2xs)] font-semibold",
                isActive
                  ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                  : isComplete
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-background text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {isComplete && !isActive ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                section.letter
              )}
              <span
                className={cn(
                  "absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] font-bold tabular-nums",
                  isActive
                    ? "border-primary-foreground/40 bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
            </span>
            <span className="flex flex-1 flex-col min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-medium leading-tight truncate">
                  {section.shortLabel}
                </span>
                {isRequired ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0 text-[8px] font-bold uppercase tracking-wide",
                      isActive
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-destructive/10 text-destructive",
                    )}
                    aria-label="Required"
                  >
                    Req
                  </span>
                ) : (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0 text-[8px] font-medium uppercase tracking-wide",
                      isActive
                        ? "bg-primary-foreground/10 text-primary-foreground/80"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-label="Optional"
                  >
                    Opt
                  </span>
                )}
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

      {nextStep && nextStep.id !== activeSectionId ? (
        <button
          type="button"
          onClick={() => onSelect(nextStep.id)}
          aria-label="Jump to next step"
          data-testid={`consultation-next-step-${nextStep.id}`}
          className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  return (
    <div
      className="md:hidden sticky top-[var(--consultation-page-header-height)] z-10 flex flex-nowrap gap-0 overflow-x-auto overscroll-x-contain border-b bg-background/95 backdrop-blur [scrollbar-width:thin]"
      role="tablist"
      aria-label="Consultation sections"
    >
      {sections.map((section, index) => {
        const isActive = section.id === activeSectionId;
        const isComplete = completion[section.id] ?? false;
        const isRequired = section.required ?? false;
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
            <span className="mr-1.5 text-[var(--fs-2xs)] font-bold tabular-nums">
              {index + 1}.
            </span>
            {section.shortLabel}
            {isRequired ? (
              <span
                className="ml-1 text-destructive"
                aria-label="Required"
              >
                *
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
