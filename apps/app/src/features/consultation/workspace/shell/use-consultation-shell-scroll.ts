import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useNavigate, useSearchParams } from "react-router";
import { resolveConsultationSectionFromUrl } from "@/features/consultation/rules/consultationTabRouting";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";
import {
  buildLetterNavMap,
  buildSectionUrlParams,
  cleanSectionUrlParams,
} from "./consultation-shell-scroll-helpers";
import {
  useFocusSectionTracking,
  useNewItemFocus,
  usePendingUrlScroll,
  useScrollListeners,
} from "./use-consultation-shell-scroll-effects";
import type { ShellScrollRefs } from "./use-consultation-shell-scroll-types";

interface ConsultationShellScrollOptions {
  sections: ConsultationSection[];
  clinicType?: string;
  stepMode?: boolean;
}

type ShellRouter = ReturnType<typeof useNavigate>;
type ShellSearchParams = URLSearchParams;

export function useConsultationShellScroll({
  sections,
  clinicType,
  stepMode = false,
}: ConsultationShellScrollOptions) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refs = useShellScrollRefs(sections);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => sections[0]?.id ?? "subjective",
  );
  const [pendingUrlScrollToSectionId, setPendingUrlScrollToSectionId] =
    useState<string | null>(null);
  const computeActiveSectionFromScroll = useActiveSectionComputer({
    stepMode,
    refs,
    setActiveSectionId,
  });
  const scheduleScrollSpy = useScrollSpyScheduler({
    refs,
    computeActiveSectionFromScroll,
  });
  const setSectionRef = useSectionRefSetter({ refs, scheduleScrollSpy });

  useScrollSpyCleanup(refs.scrollSpyRaf);
  useUrlSectionSync({
    sections,
    clinicType,
    stepMode,
    navigate,
    searchParams,
    refs,
    activeSectionId,
    setActiveSectionId,
    setPendingUrlScrollToSectionId,
  });
  usePendingUrlScroll({
    refs,
    pendingUrlScrollToSectionId,
    setPendingUrlScrollToSectionId,
    computeActiveSectionFromScroll,
  });
  useScrollListeners({ refs, scheduleScrollSpy });
  useFocusSectionTracking({ refs, stepMode, setActiveSectionId });

  return {
    activeSectionId,
    selectSection: useSectionSelector({
      navigate,
      searchParams,
      stepMode,
      refs,
      setActiveSectionId,
    }),
    mainScrollRef: refs.mainScrollRef,
    setSectionRef,
    focusNewItem: useNewItemFocus({ stepMode, refs, setActiveSectionId }),
    letterNavMap: useMemo(() => buildLetterNavMap(sections), [sections]),
  };
}

function useShellScrollRefs(sections: ConsultationSection[]): ShellScrollRefs {
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  return {
    sectionsRef,
    mainScrollRef: useRef<HTMLElement | null>(null),
    sectionRefs: useRef<Record<string, HTMLElement | null>>({}),
    layoutBumpRaf: useRef<number | null>(null),
    scrollSpyRaf: useRef<number | null>(null),
    pendingUrlScrollRef: useRef<string | null>(null),
    lastUrlScrollKeyRef: useRef(""),
    scrollSpySuppressedUntilRef: useRef(0),
  };
}

function useActiveSectionComputer(params: {
  stepMode: boolean;
  refs: ShellScrollRefs;
  setActiveSectionId: (value: string | ((prev: string) => string)) => void;
}) {
  const { stepMode, refs, setActiveSectionId } = params;
  const {
    mainScrollRef,
    pendingUrlScrollRef,
    scrollSpySuppressedUntilRef,
    sectionRefs,
    sectionsRef,
  } = refs;
  return useCallback(() => {
    if (stepMode) return;
    if (pendingUrlScrollRef.current != null) return;
    if (performance.now() < scrollSpySuppressedUntilRef.current) return;
    const root = mainScrollRef.current;
    if (!root) return;
    const activationY = root.getBoundingClientRect().top + 48;
    let chosen = sectionsRef.current[0]?.id ?? "subjective";
    for (const section of sectionsRef.current) {
      const el = sectionRefs.current[section.id];
      if (!el) continue;
      if (el.getBoundingClientRect().top <= activationY) chosen = section.id;
    }
    setActiveSectionId((prev) => (prev === chosen ? prev : chosen));
  }, [
    mainScrollRef,
    pendingUrlScrollRef,
    scrollSpySuppressedUntilRef,
    sectionRefs,
    sectionsRef,
    setActiveSectionId,
    stepMode,
  ]);
}

function useScrollSpyScheduler(params: {
  refs: ShellScrollRefs;
  computeActiveSectionFromScroll: () => void;
}) {
  const { refs, computeActiveSectionFromScroll } = params;
  const { scrollSpyRaf } = refs;
  return useCallback(() => {
    if (scrollSpyRaf.current != null) cancelAnimationFrame(scrollSpyRaf.current);
    scrollSpyRaf.current = requestAnimationFrame(() => {
      scrollSpyRaf.current = null;
      computeActiveSectionFromScroll();
    });
  }, [computeActiveSectionFromScroll, scrollSpyRaf]);
}

function useSectionRefSetter(params: {
  refs: ShellScrollRefs;
  scheduleScrollSpy: () => void;
}) {
  const { refs, scheduleScrollSpy } = params;
  const { layoutBumpRaf, sectionRefs } = refs;
  return useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
      if (el === null) return;
      if (layoutBumpRaf.current != null) cancelAnimationFrame(layoutBumpRaf.current);
      layoutBumpRaf.current = requestAnimationFrame(() => {
        layoutBumpRaf.current = null;
        scheduleScrollSpy();
      });
    },
    [layoutBumpRaf, scheduleScrollSpy, sectionRefs],
  );
}

function useScrollSpyCleanup(
  scrollSpyRaf: MutableRefObject<number | null>,
): void {
  useEffect(() => {
    return () => cancelStoredAnimationFrame(scrollSpyRaf);
  }, [scrollSpyRaf]);
}

function cancelStoredAnimationFrame(
  rafRef: MutableRefObject<number | null>,
): void {
  if (rafRef.current == null) return;
  cancelAnimationFrame(rafRef.current);
  rafRef.current = null;
}

function useSectionSelector(params: {
  navigate: ShellRouter;
  searchParams: ShellSearchParams;
  stepMode: boolean;
  refs: ShellScrollRefs;
  setActiveSectionId: (value: string) => void;
}) {
  const { navigate, searchParams, stepMode, refs, setActiveSectionId } = params;
  const { mainScrollRef, sectionRefs, sectionsRef } = refs;
  return useCallback(
    (id: string) => {
      setActiveSectionId(id);
      if (stepMode) {
        mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        sectionRefs.current[id]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      const next = buildSectionUrlParams(
        searchParams?.toString(),
        id,
        sectionsRef.current[0]?.id ?? "subjective",
      );
      navigate(`?${next}`, { replace: true });
    },
    [
      mainScrollRef,
      navigate,
      searchParams,
      sectionRefs,
      sectionsRef,
      setActiveSectionId,
      stepMode,
    ],
  );
}

function useUrlSectionSync(params: {
  sections: ConsultationSection[];
  clinicType: string | undefined;
  stepMode: boolean;
  navigate: ShellRouter;
  searchParams: ShellSearchParams;
  refs: ShellScrollRefs;
  activeSectionId: string;
  setActiveSectionId: (value: string) => void;
  setPendingUrlScrollToSectionId: (value: string | null) => void;
}) {
  const {
    sections,
    clinicType,
    stepMode,
    navigate,
    searchParams,
    refs,
    activeSectionId,
    setActiveSectionId,
    setPendingUrlScrollToSectionId,
  } = params;
  const sectionIdsKey = sections.map((section) => section.id).join(",");
  const sectionQ = searchParams.get("section");
  const tabQ = searchParams.get("tab");

  useEffect(() => {
    const resolved = resolveConsultationSectionFromUrl(sectionQ, tabQ, clinicType);
    const defaultSectionId = sections[0]?.id ?? "subjective";
    const valid =
      sections.find((section) => section.id === resolved)?.id ?? defaultSectionId;
    if (valid !== activeSectionId) {
      setActiveSectionId(valid);
    }
    queueUrlScrollIfNeeded({
      refs,
      sectionQ,
      tabQ,
      valid,
      sectionIdsKey,
      stepMode,
      setPendingUrlScrollToSectionId,
    });
    const { params: cleanedParams, changed } = cleanSectionUrlParams(
      searchParams.toString(),
      valid,
      defaultSectionId,
      tabQ,
    );
    if (changed) navigate(`?${cleanedParams}`, { replace: true });
  }, [
    activeSectionId,
    clinicType,
    refs,
    navigate,
    searchParams,
    sectionIdsKey,
    sectionQ,
    sections,
    setActiveSectionId,
    setPendingUrlScrollToSectionId,
    stepMode,
    tabQ,
  ]);
}

function queueUrlScrollIfNeeded(params: {
  refs: ShellScrollRefs;
  sectionQ: string | null;
  tabQ: string | null;
  valid: string;
  sectionIdsKey: string;
  stepMode: boolean;
  setPendingUrlScrollToSectionId: (value: string | null) => void;
}): void {
  const { refs, sectionQ, tabQ, valid, sectionIdsKey, stepMode } = params;
  if (!(sectionQ?.trim() || tabQ) || stepMode) return;
  const urlScrollKey = `${sectionQ ?? ""}|${tabQ ?? ""}|${valid}|${sectionIdsKey}`;
  if (refs.lastUrlScrollKeyRef.current === urlScrollKey) return;
  refs.lastUrlScrollKeyRef.current = urlScrollKey;
  refs.pendingUrlScrollRef.current = valid;
  params.setPendingUrlScrollToSectionId(valid);
}
