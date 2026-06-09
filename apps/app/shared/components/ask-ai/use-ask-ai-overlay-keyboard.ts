"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { resolveAskAiScopeFromPathname } from "./resolve-ask-ai-scope-from-pathname";

export function useAskAiOverlayKeyboard(open: boolean, openOverlay: (scope: ReturnType<typeof resolveAskAiScopeFromPathname>) => void, closeOverlay: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "j" || !(event.metaKey || event.ctrlKey)) return;
      if (open) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable) return;
      event.preventDefault();
      openOverlay(resolveAskAiScopeFromPathname(pathname));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openOverlay, closeOverlay, pathname]);
}
