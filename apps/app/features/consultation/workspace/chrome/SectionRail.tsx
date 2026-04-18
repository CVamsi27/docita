"use client";

import { useMemo } from "react";
import { cn } from "@workspace/ui/lib/utils";
import {
  ClipboardList,
  Eye,
  Pill,
  Stethoscope,
  Target,
} from "lucide-react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

export interface ConsultationSection {
  id: string;
  label: string;
  shortLabel: string;
  letter: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  specialty?: "DENTAL" | "OPHTHALMOLOGY" | "PEDIATRIC";
}

export const BASE_SECTIONS: ConsultationSection[] = [
  {
    id: "subjective",
    letter: "S",
    label: "Subjective",
    shortLabel: "Subjective",
    icon: ClipboardList,
  },
  {
    id: "objective",
    letter: "O",
    label: "Objective",
    shortLabel: "Objective",
    icon: Stethoscope,
  },
  {
    id: "assessment",
    letter: "A",
    label: "Assessment",
    shortLabel: "Assessment",
    icon: Target,
  },
  {
    id: "plan",
    letter: "P",
    label: "Plan",
    shortLabel: "Plan",
    icon: Pill,
  },
];

export function useSectionsForClinic(clinicType?: string): ConsultationSection[] {
  return useMemo(() => {
    const sections = [...BASE_SECTIONS];
    if (clinicType === "DENTAL") {
      sections.splice(2, 0, {
        id: "specialty-dental",
        letter: "D",
        label: "Dental Chart",
        shortLabel: "Dental",
        icon: Eye,
        specialty: "DENTAL",
      });
    }
    if (clinicType === "OPHTHALMOLOGY") {
      sections.splice(2, 0, {
        id: "specialty-vision",
        letter: "V",
        label: "Vision Exam",
        shortLabel: "Vision",
        icon: Eye,
        specialty: "OPHTHALMOLOGY",
      });
    }
    if (clinicType === "PEDIATRIC") {
      sections.splice(2, 0, {
        id: "specialty-growth",
        letter: "G",
        label: "Growth Chart",
        shortLabel: "Growth",
        icon: Eye,
        specialty: "PEDIATRIC",
      });
    }
    return sections;
  }, [clinicType]);
}

interface SectionRailProps {
  sections: ConsultationSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  className?: string;
}

function useSectionCompletion() {
  const chiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const history = useConsultationDraft((s) => s.history);
  const examination = useConsultationDraft((s) => s.examination);
  const diagnosis = useConsultationDraft((s) => s.diagnosis);
  const treatment = useConsultationDraft((s) => s.treatment);
  const prescriptions = useConsultationDraft((s) => s.prescriptions);
  const dentalChart = useConsultationDraft((s) => s.dentalChart);
  const eyeExam = useConsultationDraft((s) => s.eyeExam);
  const growthData = useConsultationDraft((s) => s.growthData);

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
      !!examination.systemic.notes?.trim();

    const map: Record<string, boolean> = {
      subjective:
        (chiefComplaint.length > 0 &&
          chiefComplaint.some((c) => c.complaint?.trim())) ||
        !!history.trim(),
      objective: examComplete,
      assessment:
        diagnosis.length > 0 &&
        diagnosis.some((d) => d.condition?.trim().length > 0),
      plan: !!treatment.trim() || prescriptions.length > 0,
      "specialty-dental": Object.keys(dentalChart).length > 0,
      "specialty-vision": Object.keys(eyeExam).length > 0,
      "specialty-growth": (growthData?.measurements?.length ?? 0) > 0,
    };
    return map;
  }, [
    chiefComplaint,
    history,
    examination,
    diagnosis,
    treatment,
    prescriptions,
    dentalChart,
    eyeExam,
    growthData,
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
              "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
              <span
                className={cn(
                  "text-[var(--fs-2xs)] uppercase tracking-wide",
                  isActive
                    ? "text-primary-foreground/80"
                    : isComplete
                      ? "text-success"
                      : "text-muted-foreground/70",
                )}
              >
                {isComplete ? "Documented" : "Pending"}
              </span>
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
      className="md:hidden sticky top-[57px] z-10 flex overflow-x-auto border-b bg-background/95 backdrop-blur"
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
