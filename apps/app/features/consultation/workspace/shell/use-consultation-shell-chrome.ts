import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Save,
} from "lucide-react";
import { type CommandPaletteAction } from "@/features/consultation/workspace/chrome/CommandPalette";
import { Feature } from "@workspace/types";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export function useConsultationShellChrome({
  sections,
  selectSection,
  focusNewItem,
  letterNavMap,
  readOnly,
  paletteOpen,
  onPaletteOpenChange,
  patientLinkId,
  canViewPrescriptions,
  canManageTemplates,
  canAccess,
  openVitals,
  onSaveClick,
}: {
  sections: ConsultationSection[];
  selectSection: (id: string) => void;
  focusNewItem: (kind: "c" | "d" | "m") => void;
  letterNavMap: Record<string, string>;
  readOnly?: boolean;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  patientLinkId: string;
  canViewPrescriptions: boolean;
  canManageTemplates: boolean;
  canAccess: (feature: Feature) => boolean;
  openVitals: () => void;
  onSaveClick: () => void | Promise<void>;
}) {
  const router = useRouter();

  const paletteActions = useMemo<CommandPaletteAction[]>(
    () => [
      ...sections.map((section) => ({
        id: `nav-${section.id}`,
        label: `Go to ${section.label}`,
        group: "Navigate" as const,
        icon: section.icon,
        shortcut: `g ${section.letter.toLowerCase()}`,
        onRun: () => selectSection(section.id),
      })),
      {
        id: "nav-opd-queue",
        label: "Back to OPD queue",
        group: "Navigate" as const,
        icon: ClipboardList,
        shortcut: "q",
        onRun: () => {
          void router.push("/consultation");
        },
      },
      ...(patientLinkId && canViewPrescriptions
        ? ([
            {
              id: "nav-patient-prescriptions",
              label: "Patient prescriptions",
              group: "Navigate" as const,
              icon: Pill,
              onRun: () => {
                void router.push(
                  `/prescriptions?patientId=${encodeURIComponent(patientLinkId)}`,
                );
              },
            },
          ] satisfies CommandPaletteAction[])
        : []),
      ...(patientLinkId && canAccess(Feature.LAB_TESTS)
        ? ([
            {
              id: "nav-patient-labs",
              label: "Patient lab tests",
              group: "Navigate" as const,
              icon: FlaskConical,
              onRun: () => {
                void router.push(
                  `/patients/${patientLinkId}?tab=records&subtab=labs`,
                );
              },
            },
          ] satisfies CommandPaletteAction[])
        : []),
      ...(canManageTemplates
        ? ([
            {
              id: "nav-templates",
              label: "Note templates",
              group: "Navigate" as const,
              icon: FileText,
              onRun: () => {
                void router.push("/templates");
              },
            },
          ] satisfies CommandPaletteAction[])
        : []),
      {
        id: "add-complaint",
        label: "Add chief complaint",
        group: "Add" as const,
        shortcut: "n c",
        onRun: () => focusNewItem("c"),
      },
      {
        id: "add-diagnosis",
        label: "Add diagnosis",
        group: "Add" as const,
        shortcut: "n d",
        onRun: () => focusNewItem("d"),
      },
      {
        id: "add-medication",
        label: "Add medication",
        group: "Add" as const,
        shortcut: "n m",
        onRun: () => focusNewItem("m"),
      },
      {
        id: "open-vitals",
        label: "Record vitals",
        group: "Action" as const,
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
    [
      canAccess,
      canManageTemplates,
      canViewPrescriptions,
      focusNewItem,
      onSaveClick,
      openVitals,
      patientLinkId,
      readOnly,
      router,
      sections,
      selectSection,
    ],
  );

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onPaletteOpenChange(!paletteOpen);
        return;
      }
      if (modKey && e.key.toLowerCase() === "s") {
        if (readOnly) return;
        e.preventDefault();
        void onSaveClick();
        return;
      }
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable)
        return;
      if (e.key === "?") {
        e.preventDefault();
        onPaletteOpenChange(true);
        return;
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        openVitals();
        return;
      }
      if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        void router.push("/consultation");
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
    onPaletteOpenChange,
    onSaveClick,
    openVitals,
    paletteOpen,
    readOnly,
    router,
    sections,
    selectSection,
  ]);

  return { paletteActions };
}
