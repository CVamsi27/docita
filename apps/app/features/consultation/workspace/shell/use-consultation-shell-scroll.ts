import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveConsultationSectionFromUrl } from "@/features/consultation/rules/consultationTabRouting";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export function useConsultationShellScroll({
  sections,
  clinicType,
  stepMode = false,
}: {
  sections: ConsultationSection[];
  clinicType?: string;
  /** One-section-at-a-time mode: disable scroll-spy; selecting resets to top. */
  stepMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionIdsKey = sections.map((s) => s.id).join(",");
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => sections[0]?.id ?? "subjective",
  );

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const layoutBumpRaf = useRef<number | null>(null);
  const scrollSpyRaf = useRef<number | null>(null);
  const [pendingUrlScrollToSectionId, setPendingUrlScrollToSectionId] =
    useState<string | null>(null);
  const pendingUrlScrollRef = useRef<string | null>(null);
  const lastUrlScrollKeyRef = useRef<string>("");
  const scrollSpySuppressedUntilRef = useRef(0);

  const computeActiveSectionFromScroll = useCallback(() => {
    if (stepMode) return;
    if (pendingUrlScrollRef.current != null) return;
    if (performance.now() < scrollSpySuppressedUntilRef.current) return;
    const root = mainScrollRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const activationY = rootRect.top + 48;
    let chosen = sectionsRef.current[0]?.id ?? "subjective";
    for (const s of sectionsRef.current) {
      const el = sectionRefs.current[s.id];
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= activationY) chosen = s.id;
    }
    setActiveSectionId((prev) => (prev === chosen ? prev : chosen));
  }, [stepMode]);

  const scheduleScrollSpy = useCallback(() => {
    if (scrollSpyRaf.current != null) cancelAnimationFrame(scrollSpyRaf.current);
    scrollSpyRaf.current = requestAnimationFrame(() => {
      scrollSpyRaf.current = null;
      computeActiveSectionFromScroll();
    });
  }, [computeActiveSectionFromScroll]);

  const setSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
      if (el === null) return;
      if (layoutBumpRaf.current != null) cancelAnimationFrame(layoutBumpRaf.current);
      layoutBumpRaf.current = requestAnimationFrame(() => {
        layoutBumpRaf.current = null;
        scheduleScrollSpy();
      });
    },
    [scheduleScrollSpy],
  );

  useEffect(() => {
    return () => {
      if (scrollSpyRaf.current != null) cancelAnimationFrame(scrollSpyRaf.current);
    };
  }, []);

  const selectSection = useCallback(
    (id: string) => {
      setActiveSectionId(id);
      if (stepMode) {
        // Keep the pinned past-history card in view when switching steps.
        mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = sectionRefs.current[id];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.delete("tab");
      const firstId = sectionsRef.current[0]?.id ?? "subjective";
      if (id !== firstId) {
        next.set("section", id);
      } else {
        next.delete("section");
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams, stepMode],
  );

  const sectionQ = searchParams.get("section");
  const tabQ = searchParams.get("tab");

  useEffect(() => {
    const resolved = resolveConsultationSectionFromUrl(sectionQ, tabQ, clinicType);
    const matchedResolved = resolved
      ? sections.find((s) => s.id === resolved)
      : undefined;
    const defaultSectionId = sections[0]?.id ?? "subjective";
    const valid = matchedResolved?.id ?? defaultSectionId;
    setActiveSectionId(valid);
    const wantsScrollFromUrl = Boolean(sectionQ?.trim() || tabQ) && !stepMode;
    if (wantsScrollFromUrl) {
      const urlScrollKey = `${sectionQ ?? ""}|${tabQ ?? ""}|${valid}|${sectionIdsKey}`;
      if (lastUrlScrollKeyRef.current !== urlScrollKey) {
        lastUrlScrollKeyRef.current = urlScrollKey;
        pendingUrlScrollRef.current = valid;
        setPendingUrlScrollToSectionId(valid);
      }
    }
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (tabQ) {
      next.delete("tab");
      changed = true;
    }
    if (valid !== defaultSectionId) {
      if (next.get("section") !== valid) {
        next.set("section", valid);
        changed = true;
      }
    } else if (next.has("section")) {
      next.delete("section");
      changed = true;
    }
    if (changed) router.replace(`?${next.toString()}`, { scroll: false });
  }, [
    sectionQ,
    tabQ,
    clinicType,
    sectionIdsKey,
    router,
    searchParams,
    sections,
    stepMode,
  ]);

  useEffect(() => {
    const targetId = pendingUrlScrollToSectionId;
    if (!targetId) return;
    let cancelled = false;
    let attempts = 0;
    let rafId = 0;
    const maxAttempts = 48;
    const tick = () => {
      if (cancelled) return;
      const el = sectionRefs.current[targetId];
      const main = mainScrollRef.current;
      if (el && main) {
        setPendingUrlScrollToSectionId(null);
        el.scrollIntoView({ behavior: "auto", block: "start" });
        requestAnimationFrame(() => {
          pendingUrlScrollRef.current = null;
          computeActiveSectionFromScroll();
        });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        rafId = requestAnimationFrame(tick);
      } else {
        setPendingUrlScrollToSectionId(null);
        pendingUrlScrollRef.current = null;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pendingUrlScrollToSectionId, computeActiveSectionFromScroll]);

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
  }, [scheduleScrollSpy]);

  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!root.contains(target)) return;
      const sectionEl = target.closest("[data-section-id]");
      const id = sectionEl?.getAttribute("data-section-id");
      if (!id) return;
      if (!sectionsRef.current.some((s) => s.id === id)) return;
      scrollSpySuppressedUntilRef.current = performance.now() + 520;
      setActiveSectionId((prev) => (prev === id ? prev : id));
    };
    root.addEventListener("focusin", onFocusIn);
    return () => root.removeEventListener("focusin", onFocusIn);
  }, []);

  const focusNewItem = useCallback(
    (kind: "c" | "d" | "m") => {
      const selectorMap: Record<"c" | "d" | "m", string> = {
        c: '[data-section-id="subjective"] input[placeholder*="complaint" i], [data-section-id="subjective"] input',
        d: '[data-section-id="assessment"] input',
        m: '[data-section-id="plan"] input',
      };
      const rootId =
        kind === "c" ? "subjective" : kind === "d" ? "assessment" : "plan";
      if (stepMode) {
        // The target section may not be mounted; switch to it first.
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
    [stepMode],
  );

  const letterNavMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sections) map[s.letter.toLowerCase()] = s.id;
    return map;
  }, [sections]);

  return {
    activeSectionId,
    selectSection,
    mainScrollRef,
    setSectionRef,
    focusNewItem,
    letterNavMap,
  };
}
