import { ClipboardList, FileText, FlaskConical, HeartPulse, Pill, Save } from "lucide-react";
import type { CommandPaletteAction } from "@/features/consultation/workspace/chrome/CommandPalette";
import { Feature } from "@workspace/types";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface BuildPaletteActionsParams {
  sections: ConsultationSection[];
  selectSection: (id: string) => void;
  router: { push: (url: string) => void };
  patientLinkId: string;
  canViewPrescriptions: boolean;
  canAccess: (feature: Feature) => boolean;
  canManageTemplates: boolean;
  focusNewItem: (kind: "c" | "d" | "m") => void;
  openVitals: () => void;
  readOnly?: boolean;
  onSaveClick: () => void | Promise<void>;
}

export function buildConsultationPaletteActions({
  sections,
  selectSection,
  router,
  patientLinkId,
  canViewPrescriptions,
  canAccess,
  canManageTemplates,
  focusNewItem,
  openVitals,
  readOnly,
  onSaveClick,
}: BuildPaletteActionsParams): CommandPaletteAction[] {
  return [
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
            shortcut: "\u2318 S",
            onRun: onSaveClick,
          },
        ]),
  ];
}
