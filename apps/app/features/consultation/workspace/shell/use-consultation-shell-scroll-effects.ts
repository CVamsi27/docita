import { useCallback, useEffect, type MutableRefObject } from "react";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
import {
  buildScrollSpyRootId,
  buildScrollSpySelectorMap,
} from "./consultation-shell-scroll-helpers";
import type { ShellScrollRefs } from "./use-consultation-shell-scroll-types";

export function usePendingUrlScroll(params: {
  refs: ShellScrollRefs;
  pendingUrlScrollToSectionId: string | null;
  setPendingUrlScrollToSectionId: (value: string | null) => void;
  computeActiveSectionFromScroll: () => void;
}) {
  const {
    refs,
    pendingUrlScrollToSectionId,
    setPendingUrlScrollToSectionId,
    computeActiveSectionFromScroll,
  } = params;
  useEffect(() => {
    const targetId = pendingUrlScrollToSectionId;
    if (!targetId) return;
    return runPendingUrlScroll({
      refs,
      targetId,
      setPendingUrlScrollToSectionId,
      computeActiveSectionFromScroll,
    });
  }, [
    computeActiveSectionFromScroll,
    pendingUrlScrollToSectionId,
    refs,
    setPendingUrlScrollToSectionId,
  ]);
}

function runPendingUrlScroll(params: {
  refs: ShellScrollRefs;
  targetId: string;
  setPendingUrlScrollToSectionId: (value: string | null) => void;
  computeActiveSectionFromScroll: () => void;
}) {
  let cancelled = false;
  let attempts = 0;
  let rafId = 0;
  const tick = () => {
    if (cancelled) return;
    if (tryCompletePendingUrlScroll(params)) return;
    attempts += 1;
    if (attempts < 48) {
      rafId = requestAnimationFrame(tick);
    } else {
      clearPendingUrlScroll(params.refs, params.setPendingUrlScrollToSectionId);
    }
  };
  rafId = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

function tryCompletePendingUrlScroll(params: {
  refs: ShellScrollRefs;
  targetId: string;
  setPendingUrlScrollToSectionId: (value: string | null) => void;
  computeActiveSectionFromScroll: () => void;
}): boolean {
  const el = params.refs.sectionRefs.current[params.targetId];
  const main = params.refs.mainScrollRef.current;
  if (!el || !main) return false;
  params.setPendingUrlScrollToSectionId(null);
  el.scrollIntoView({ behavior: "auto", block: "start" });
  requestAnimationFrame(() => {
    params.refs.pendingUrlScrollRef.current = null;
    params.computeActiveSectionFromScroll();
  });
  return true;
}

function clearPendingUrlScroll(
  refs: ShellScrollRefs,
  setPendingUrlScrollToSectionId: (value: string | null) => void,
): void {
  setPendingUrlScrollToSectionId(null);
  refs.pendingUrlScrollRef.current = null;
}

export function useScrollListeners(params: {
  refs: ShellScrollRefs;
  scheduleScrollSpy: () => void;
}) {
  const { refs, scheduleScrollSpy } = params;
  const { mainScrollRef, scrollSpySuppressedUntilRef } = refs;
  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const clearScrollSpySuppression = () => {
      scrollSpySuppressedUntilRef.current = 0;
    };
    scheduleScrollSpy();
    root.addEventListener("scroll", scheduleScrollSpy, { passive: true });
    window.addEventListener("resize", scheduleScrollSpy, { passive: true });
    root.addEventListener("wheel", clearScrollSpySuppression, { passive: true });
    root.addEventListener("touchstart", clearScrollSpySuppression, {
      passive: true,
    });
    return () => {
      root.removeEventListener("scroll", scheduleScrollSpy);
      window.removeEventListener("resize", scheduleScrollSpy);
      root.removeEventListener("wheel", clearScrollSpySuppression);
      root.removeEventListener("touchstart", clearScrollSpySuppression);
    };
  }, [mainScrollRef, scheduleScrollSpy, scrollSpySuppressedUntilRef]);
}

export function useFocusSectionTracking(params: {
  refs: ShellScrollRefs;
  setActiveSectionId: (value: string | ((prev: string) => string)) => void;
}) {
  const { refs, setActiveSectionId } = params;
  const { mainScrollRef, scrollSpySuppressedUntilRef, sectionsRef } = refs;
  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const onFocusIn = (event: FocusEvent) => {
      updateActiveSectionFromFocus({
        event,
        root,
        sectionsRef,
        scrollSpySuppressedUntilRef,
        setActiveSectionId,
      });
    };
    root.addEventListener("focusin", onFocusIn);
    return () => root.removeEventListener("focusin", onFocusIn);
  }, [
    mainScrollRef,
    scrollSpySuppressedUntilRef,
    sectionsRef,
    setActiveSectionId,
  ]);
}

function updateActiveSectionFromFocus(params: {
  event: FocusEvent;
  root: HTMLElement;
  sectionsRef: MutableRefObject<ConsultationSection[]>;
  scrollSpySuppressedUntilRef: MutableRefObject<number>;
  setActiveSectionId: (value: string | ((prev: string) => string)) => void;
}): void {
  const target = params.event.target;
  if (!(target instanceof Element)) return;
  if (!params.root.contains(target)) return;
  const id = target.closest("[data-section-id]")?.getAttribute("data-section-id");
  if (!id) return;
  if (!params.sectionsRef.current.some((section) => section.id === id)) return;
  params.scrollSpySuppressedUntilRef.current = performance.now() + 520;
  params.setActiveSectionId((prev) => (prev === id ? prev : id));
}

export function useNewItemFocus(params: {
  stepMode: boolean;
  refs: ShellScrollRefs;
  setActiveSectionId: (value: string) => void;
}) {
  const { stepMode, refs, setActiveSectionId } = params;
  const { sectionRefs } = refs;
  return useCallback(
    (kind: "c" | "d" | "m") => {
      const selectorMap = buildScrollSpySelectorMap();
      const rootId = buildScrollSpyRootId(kind);
      if (stepMode) {
        setActiveSectionId(rootId);
      } else {
        sectionRefs.current[rootId]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      setTimeout(() => {
        document.querySelector<HTMLInputElement>(selectorMap[kind])?.focus();
      }, 300);
    },
    [sectionRefs, setActiveSectionId, stepMode],
  );
}
