import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Feature } from "@workspace/types";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
import { buildConsultationPaletteActions } from "./consultation-palette-actions";
import { useConsultationKeyboardShortcuts } from "./use-consultation-keyboard-shortcuts";

interface UseConsultationShellChromeParams {
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
}

export function useConsultationShellChrome(params: UseConsultationShellChromeParams) {
  const router = useRouter();

  const paletteActions = useMemo(
    () => buildConsultationPaletteActions({ ...params, router }),
    [params, router],
  );

  useConsultationKeyboardShortcuts({
    onPaletteOpenChange: params.onPaletteOpenChange,
    paletteOpen: params.paletteOpen,
    readOnly: params.readOnly,
    onSaveClick: params.onSaveClick,
    openVitals: params.openVitals,
    router,
    letterNavMap: params.letterNavMap,
    focusNewItem: params.focusNewItem,
    sections: params.sections,
    selectSection: params.selectSection,
  });

  return { paletteActions };
}
