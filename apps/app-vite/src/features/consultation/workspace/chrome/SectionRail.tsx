import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button, MicroLabel, StepProgress } from "@workspace/ui/components";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
import { findNextStep, useSectionCompletion } from "./SectionRail-sections";


interface SectionRailProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  className?: string;
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
          <Button
            key={section.id}
            variant="ghost"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left h-auto justify-start",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-label={`Go to ${section.shortLabel}`}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                isComplete
                  ? "border-success/50 bg-success/10 text-success"
                  : isActive
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : needsAttention
                      ? "border-warning/40 bg-warning/5 text-muted-foreground"
                      : "border-border/60 bg-background text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {isComplete ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="flex flex-1 min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "truncate text-[13px] leading-tight",
                  isActive ? "font-semibold text-foreground" : "font-medium",
                )}
              >
                {section.shortLabel}
              </span>
              {section.subtitle ? (
                <span className="truncate text-[11px] leading-snug text-muted-foreground">
                  {section.subtitle}
                </span>
              ) : null}
              {(isComplete || needsAttention) ? (
                <span
                  className={cn(
                    "text-[10px] font-semibold leading-snug",
                    isComplete ? "text-success" : "text-warning",
                  )}
                >
                  {isComplete ? "Done" : "Required"}
                </span>
              ) : null}
            </span>
          </Button>
        );
      })}
      {nextStep && nextStep.id !== activeSectionId ? (
        <Button
          variant="outline"
          onClick={() => onSelect(nextStep.id)}
          aria-label="Jump to next step"
          data-testid={`consultation-next-step-${nextStep.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 px-2.5 py-2 text-left h-auto hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </Button>
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
