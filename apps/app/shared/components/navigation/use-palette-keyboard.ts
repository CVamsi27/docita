"use client";

import { useCallback, useEffect, useState } from "react";

export function usePaletteKeyboard() {
  const [open, setOpen] = useState(false);

  const openIt = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "/") {
        const target = e.target instanceof HTMLElement ? e.target : null;
        const isEditable =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", down);
    window.addEventListener("docita:open-command-palette", openIt);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("docita:open-command-palette", openIt);
    };
  }, [openIt]);

  return { open, setOpen };
}
