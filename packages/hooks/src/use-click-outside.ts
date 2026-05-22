"use client";

import { useEffect } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutsideClick: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode =
        event.target instanceof Node ? event.target : null;
      if (!ref.current || !targetNode || ref.current.contains(targetNode)) {
        return;
      }

      onOutsideClick();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [enabled, onOutsideClick, ref]);
}
