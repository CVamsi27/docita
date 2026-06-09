"use client";

import { useMemo, useState, useEffect, useRef, type RefObject } from "react";
import { ChevronDown, History } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { SectionTabs } from "@/features/consultation/workspace/chrome/SectionRail";
import { ConsultationAfterVisitStrip } from "@/features/consultation/components/ConsultationWorkspaceExtras";
import {
  ConsultationPastHistoryCard,
  summariseHistory,
  type HistorySummary,
} from "@/features/consultation/components/ConsultationPastHistoryCard";
import {
  buildConsultationSectionComponents,
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

interface HistoryDividerProps {
  open: boolean;
  onToggle: () => void;
  summary: HistorySummary;
}

function HistoryDivider({ open, onToggle, summary }: HistoryDividerProps) {
  const label = open
    ? "Hide history"
    : summary.hasAny
      ? `Patient history · ${summary.parts.join(" · ")}`
      : "Patient history";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Hide patient history" : "Show patient history"}
      className="group flex w-full items-center gap-3 rounded py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <div className="h-px flex-1 bg-border/50 transition-colors group-hover:bg-border" />
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
        <History className="h-3 w-3" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </span>
      <div className="h-px flex-1 bg-border/50 transition-colors group-hover:bg-border" />
    </button>
  );
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
  const summary = useMemo(
    () => summariseHistory(effectivePatient),
    [effectivePatient],
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const didAutoOpen = useRef(false);

  useEffect(() => {
    if (!didAutoOpen.current && effectivePatient) {
      if (summary.hasAny) setHistoryOpen(true);
      didAutoOpen.current = true;
    }
  }, [effectivePatient, summary.hasAny]);

  // Destructure the identity fields used as memo keys — avoids re-running
  // buildConsultationSectionComponents when unrelated appointment fields change.
  const { id: apptId, patientId, doctorId } = appointmentData;
  const sectionComponents = useMemo(
    () =>
      buildConsultationSectionComponents(
        setSectionRef,
        readOnly,
        appointmentData,
        effectivePatient,
      ),
    // appointmentData object reference changes on every render; key on stable
    // primitive identity fields instead so sections only rebuild when relevant
    // data actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apptId, patientId, doctorId, effectivePatient, readOnly, setSectionRef],
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
        <div className="mx-auto max-w-3xl">
          <ConsultationPastHistoryCard
            patient={effectivePatient}
            patientLoading={patientLoading}
            readOnly={readOnly}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
          />

          <HistoryDivider
            open={historyOpen}
            onToggle={() => setHistoryOpen((o) => !o)}
            summary={summary}
          />

          <div className="flex flex-col gap-5 pt-5">
            {activeNode}

            <StepNavigation
              sections={sections}
              activeIndex={activeIndex}
              onSelectSection={onSelectSection}
            />
          </div>
        </div>
      </main>

      <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3 md:px-6">
        <div className="mx-auto max-w-3xl">
          <ConsultationAfterVisitStrip
            appointment={appointmentData}
            onGoToPlan={() => onSelectSection("plan")}
          />
        </div>
      </div>
    </div>
  );
}
