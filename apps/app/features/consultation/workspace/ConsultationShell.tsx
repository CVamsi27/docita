"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Command as CommandIcon, HeartPulse, Save } from "lucide-react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { useConsultationHydrate } from "@/features/consultation/state/useConsultationHydrate";
import { useConsultationAutosave } from "@/features/consultation/state/useConsultationAutosave";
import { usePatientWithMedicalHistory } from "@/hooks/api/use-patients";
import { SaveStatusChip } from "@/features/consultation/workspace/chrome/SaveStatusChip";
import {
  CommandPalette,
  type CommandPaletteAction,
} from "@/features/consultation/workspace/chrome/CommandPalette";
import { SectionRail, SectionTabs } from "@/features/consultation/workspace/chrome/SectionRail";
import { resolveConsultationSectionFromUrl } from "@/features/consultation/rules/consultationTabRouting";
import { getConsultationSectionsForClinic } from "@/features/consultation/workspace/consultation-section-registry";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";
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
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import type { Appointment, PatientWithMedicalHistory } from "@workspace/types";

interface ConsultationShellProps {
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
  clinicType?: string;
  readOnly?: boolean;
  isSidebarOpen?: boolean;
  saveHandlesRef?: RefObject<ConsultationSaveHandles | null>;
}

export function ConsultationShell({
  appointmentData,
  clinicType,
  readOnly,
  isSidebarOpen = true,
  saveHandlesRef,
}: ConsultationShellProps) {
  const params = useParams();
  const appointmentId = params?.["id"] as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openVitals } = useConsultationVitals();

  useConsultationHydrate({
    appointmentId,
    appointmentData: appointmentData as unknown as Record<string, unknown>,
  });

  const sections = useMemo(
    () => getConsultationSectionsForClinic(clinicType),
    [clinicType],
  );

  const sectionIdsKey = sections.map((s) => s.id).join(",");

  const { data: patient, isLoading: patientLoading } =
    usePatientWithMedicalHistory(appointmentData.patientId ?? "");

  const effectivePatient =
    patient ||
    (appointmentData.patient as unknown as
      | PatientWithMedicalHistory
      | undefined);

  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => sections[0]?.id ?? "subjective",
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const setSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    },
    [],
  );

  const { flush, submitPrescriptions } = useConsultationAutosave({
    appointmentId,
    readOnly,
    clinicType,
    patientId: appointmentData.patientId,
  });

  useEffect(() => {
    if (!saveHandlesRef) return;
    saveHandlesRef.current = { flush, submitPrescriptions };
    return () => {
      saveHandlesRef.current = null;
    };
  }, [flush, saveHandlesRef, submitPrescriptions]);

  const selectSection = useCallback(
    (id: string) => {
      setActiveSectionId(id);
      const el = sectionRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.delete("tab");
      if (id !== "subjective") {
        next.set("section", id);
      } else {
        next.delete("section");
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const sectionQ = searchParams.get("section");
  const tabQ = searchParams.get("tab");

  useEffect(() => {
    const resolved = resolveConsultationSectionFromUrl(
      sectionQ,
      tabQ,
      clinicType,
    );
    const matchedResolved = resolved
      ? sections.find((s) => s.id === resolved)
      : undefined;
    const valid = matchedResolved?.id ?? sections[0]?.id ?? "subjective";

    setActiveSectionId(valid);

    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (tabQ) {
      next.delete("tab");
      changed = true;
    }
    if (valid !== "subjective") {
      if (next.get("section") !== valid) {
        next.set("section", valid);
        changed = true;
      }
    } else if (next.has("section")) {
      next.delete("section");
      changed = true;
    }
    if (changed) {
      router.replace(`?${next.toString()}`, { scroll: false });
    }
  }, [
    sectionQ,
    tabQ,
    clinicType,
    sectionIdsKey,
    router,
    searchParams,
    sections,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top) return;
        const id = top.target.getAttribute("data-section-id");
        const matched = id
          ? sections.find((s) => s.id === id)
          : undefined;
        if (matched) {
          setActiveSectionId((prev) =>
            prev === matched.id ? prev : matched.id,
          );
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const isDirty = useConsultationDraft((s) => s.dirty);
  const saveState = useConsultationDraft((s) => s.saveState);

  const [paletteOpen, setPaletteOpen] = useState(false);

  const onSaveClick = useCallback(async () => {
    await flush({ force: true });
    await submitPrescriptions();
  }, [flush, submitPrescriptions]);

  const focusNewItem = useCallback((kind: "c" | "d" | "m") => {
    const selectorMap: Record<"c" | "d" | "m", string> = {
      c: '[data-section-id="subjective"] input[placeholder*="complaint" i], [data-section-id="subjective"] input',
      d: '[data-section-id="assessment"] input',
      m: '[data-section-id="plan"] input',
    };
    const rootId =
      kind === "c" ? "subjective" : kind === "d" ? "assessment" : "plan";
    const root = sectionRefs.current[rootId];
    root?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(selectorMap[kind]);
      input?.focus();
    }, 300);
  }, []);

  const letterNavMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sections) {
      map[s.letter.toLowerCase()] = s.id;
    }
    return map;
  }, [sections]);

  const paletteActions = useMemo<CommandPaletteAction[]>(
    () => [
      ...sections.map((section) => {
        const Icon = section.icon;
        const letter = section.letter.toLowerCase();
        return {
          id: `nav-${section.id}`,
          label: `Go to ${section.label}`,
          group: "Navigate" as const,
          icon: Icon,
          shortcut: `g ${letter}`,
          onRun: () => selectSection(section.id),
        };
      }),
      {
        id: "add-complaint",
        label: "Add chief complaint",
        group: "Add",
        shortcut: "n c",
        onRun: () => focusNewItem("c"),
      },
      {
        id: "add-diagnosis",
        label: "Add diagnosis",
        group: "Add",
        shortcut: "n d",
        onRun: () => focusNewItem("d"),
      },
      {
        id: "add-medication",
        label: "Add medication",
        group: "Add",
        shortcut: "n m",
        onRun: () => focusNewItem("m"),
      },
      {
        id: "open-vitals",
        label: "Record vitals",
        group: "Action",
        icon: HeartPulse,
        shortcut: "v",
        onRun: () => openVitals(),
      },
      ...(readOnly
        ? []
        : [
            {
              id: "save-now",
              label: "Save consultation",
              group: "Action" as const,
              icon: Save,
              shortcut: "⌘ S",
              onRun: onSaveClick,
            },
          ]),
    ],
    [focusNewItem, onSaveClick, openVitals, readOnly, sections, selectSection],
  );

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (modKey && e.key.toLowerCase() === "s") {
        if (readOnly) return;
        e.preventDefault();
        void onSaveClick();
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        openVitals();
        return;
      }
      if (e.key === "g" || e.key === "n") {
        const mode = e.key;
        const sequenceHandler = (ev: KeyboardEvent) => {
          const key = ev.key.toLowerCase();
          if (mode === "g") {
            const id = letterNavMap[key];
            if (id && sections.some((sec) => sec.id === id)) {
              ev.preventDefault();
              selectSection(id);
            }
          } else if (mode === "n" && !readOnly) {
            if (key === "c" || key === "d" || key === "m") {
              ev.preventDefault();
              focusNewItem(key);
            }
          }
          window.removeEventListener("keydown", sequenceHandler, true);
        };
        window.addEventListener("keydown", sequenceHandler, true);
        setTimeout(() => {
          window.removeEventListener("keydown", sequenceHandler, true);
        }, 1200);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    focusNewItem,
    letterNavMap,
    onSaveClick,
    openVitals,
    readOnly,
    sections,
    selectSection,
  ]);

  const sectionComponents = useMemo(
    () => ({
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
        />
      ),
    }),
    [effectivePatient, patientLoading, readOnly, setSectionRef],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <SectionRail
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={selectSection}
        className="w-56 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-3 py-2 backdrop-blur md:px-6",
            readOnly ? "justify-end" : "justify-between md:justify-end",
          )}
        >
          {!readOnly ? (
            <div className="flex min-w-0 items-center md:hidden">
              <SaveStatusChip />
            </div>
          ) : null}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="gap-1.5"
            >
              <CommandIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Quick actions</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[var(--fs-2xs)] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            {!readOnly && (
              <Button
                size="sm"
                onClick={onSaveClick}
                disabled={
                  saveState === "saving" || (!isDirty && saveState !== "error")
                }
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{saveState === "saving" ? "Saving" : "Save draft"}</span>
              </Button>
            )}
          </div>
        </div>

        <SectionTabs
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={selectSection}
        />

        <main
          className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6"
          aria-label="Consultation workspace"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {sections.map((section) => {
              const Node =
                sectionComponents[section.id as keyof typeof sectionComponents];
              return Node ?? null;
            })}
          </div>
        </main>
      </div>

      <aside
        className={cn(
          "hidden xl:flex shrink-0 bg-muted/10 transition-[width,border-color] duration-200 overflow-hidden",
          isSidebarOpen ? "w-80 border-l" : "w-0 border-l-0",
        )}
        aria-hidden={!isSidebarOpen}
      >
        {isSidebarOpen ? (
          <ConsultationSidebarContainer appointmentData={appointmentData} />
        ) : null}
      </aside>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={paletteActions}
      />
    </div>
  );
}
