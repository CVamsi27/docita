import { useEffect } from "react";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

interface UseConsultationKeyboardShortcutsParams {
  onPaletteOpenChange: (open: boolean) => void;
  paletteOpen: boolean;
  readOnly?: boolean;
  onSaveClick: () => void | Promise<void>;
  openVitals: () => void;
  router: { push: (url: string) => void };
  letterNavMap: Record<string, string>;
  focusNewItem: (kind: "c" | "d" | "m") => void;
  sections: ConsultationSection[];
  selectSection: (id: string) => void;
}

export function useConsultationKeyboardShortcuts({
  onPaletteOpenChange,
  paletteOpen,
  readOnly,
  onSaveClick,
  openVitals,
  router,
  letterNavMap,
  focusNewItem,
  sections,
  selectSection,
}: UseConsultationKeyboardShortcutsParams): void {
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
}
