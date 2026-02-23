import { useCallback, useEffect, useRef } from "react";

/**
 * Focus trap hook for modals and dialogs.
 * Traps keyboard focus within the element for accessibility.
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab: go backwards
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: go forwards
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for announcing live regions to screen readers.
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const announcement = document.createElement("div");
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", priority);
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = message;

      document.body.appendChild(announcement);

      // Remove after announcement is read
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    },
    [],
  );

  return announce;
}

/**
 * Hook for managing roving tabindex navigation.
 * Useful for toolbars, menus, and tab lists.
 */
export function useRovingTabIndex<T extends HTMLElement>(
  itemCount: number,
  initialIndex: number = 0,
) {
  const itemsRef = useRef<(T | null)[]>([]);
  const currentIndex = useRef(initialIndex);

  const setRef = useCallback(
    (index: number) => (el: T | null) => {
      itemsRef.current[index] = el;
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;
      let newIndex = currentIndex.current;

      switch (key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          newIndex = (currentIndex.current + 1) % itemCount;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          newIndex = (currentIndex.current - 1 + itemCount) % itemCount;
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = itemCount - 1;
          break;
        default:
          return;
      }

      currentIndex.current = newIndex;
      itemsRef.current[newIndex]?.focus();
    },
    [itemCount],
  );

  return { setRef, handleKeyDown, currentIndex };
}

/**
 * Props helper for accessible buttons.
 */
export function getButtonA11yProps(
  label: string,
  isLoading?: boolean,
  isDisabled?: boolean,
) {
  return {
    "aria-label": label,
    "aria-busy": isLoading,
    "aria-disabled": isDisabled,
    role: "button",
    tabIndex: isDisabled ? -1 : 0,
  };
}

/**
 * Props helper for accessible form inputs.
 */
export function getInputA11yProps(
  id: string,
  label: string,
  error?: string,
  required?: boolean,
) {
  return {
    id,
    "aria-label": label,
    "aria-required": required,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}
