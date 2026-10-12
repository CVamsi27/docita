import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Collects the elements a keyboard user can reach inside an open overlay.
 * Re-queried on every key press so a dialog whose content changes while it is
 * open never traps focus on a stale node.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return elements.filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute("disabled") &&
      !element.hidden &&
      !element.closest("[aria-hidden='true']"),
  );
}

interface DialogTabTargetParams {
  shiftKey: boolean;
  /** Index of the focused element inside the container; -1 when unknown. */
  currentIndex: number;
  count: number;
}

/**
 * Resolves the wrap-around target for Tab inside a modal.
 * Returns `null` when the browser's natural tab order already stays inside, so
 * callers only call `preventDefault` when they actually move focus.
 */
export function resolveDialogTabTarget({
  shiftKey,
  currentIndex,
  count,
}: DialogTabTargetParams): number | null {
  if (count <= 0) return null;
  if (currentIndex < 0) return shiftKey ? count - 1 : 0;

  if (shiftKey) {
    return currentIndex === 0 ? count - 1 : null;
  }
  return currentIndex === count - 1 ? 0 : null;
}

/**
 * Makes a hand-rolled overlay behave like a modal for keyboard and assistive
 * technology users: focus moves inside on open, Tab cycles within it, and focus
 * returns to the trigger on close.
 *
 * Prefer the Radix-based `Dialog` primitive when the overlay can adopt the
 * shared surface styling; this hook exists for marketing surfaces that keep a
 * bespoke visual shell.
 */
export function useDialogFocus(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const initialFocusTarget = getFocusableElements(container)[0] ?? container;
    initialFocusTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const items = getFocusableElements(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const activeElement = document.activeElement;
      const targetIndex = resolveDialogTabTarget({
        shiftKey: event.shiftKey,
        currentIndex:
          activeElement instanceof HTMLElement
            ? items.indexOf(activeElement)
            : -1,
        count: items.length,
      });
      if (targetIndex === null) return;

      event.preventDefault();
      items[targetIndex]?.focus();
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return containerRef;
}
