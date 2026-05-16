import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Save,
} from "lucide-react";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { useConsultationHydrate } from "@/features/consultation/state/useConsultationHydrate";
import { useConsultationAutosave } from "@/features/consultation/state/useConsultationAutosave";
import { usePatientWithMedicalHistory } from "@/hooks/api/use-patients";
import { type CommandPaletteAction } from "@/features/consultation/workspace/chrome/CommandPalette";
import { resolveConsultationSectionFromUrl } from "@/features/consultation/rules/consultationTabRouting";
import { getConsultationSectionsForClinic } from "@/features/consultation/workspace/consultation-section-registry";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";
import {
  CLINIC_TYPE_FEATURES,
  Feature,
  type Appointment,
  type ClinicType,
  type PatientWithMedicalHistory,
} from "@workspace/types";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";

export interface UseConsultationShellOptions {
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
  clinicType?: string;
  readOnly?: boolean;
  saveHandlesRef?: RefObject<ConsultationSaveHandles | null>;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
}

export function useConsultationShell({
  appointmentData,
  clinicType,
  readOnly,
  saveHandlesRef,
  paletteOpen,
  onPaletteOpenChange,
}: UseConsultationShellOptions) {
  const params = useParams();
  const appointmentId = params?.["id"] as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openVitals } = useConsultationVitals();
  const { canViewPrescriptions, canManageTemplates } = usePermissions();
  const { canAccess } = usePermissionStore();
  const patientLinkId = appointmentData.patientId ?? "";

  useConsultationHydrate({
    appointmentId,
    appointmentData: appointmentData as unknown as Record<string, unknown>,
  });

  const sections = useMemo(
    () => getConsultationSectionsForClinic(clinicType),
    [clinicType],
  );

  const clinicFeatures = useMemo(() => {
    const key = (clinicType?.toUpperCase() ?? "GENERAL") as ClinicType;
    return CLINIC_TYPE_FEATURES[key] ?? CLINIC_TYPE_FEATURES.GENERAL;
  }, [clinicType]);

  const sectionIdsKey = sections.map((s) => s.id).join(",");
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const { data: patient, isLoading: patientLoading } =
    usePatientWithMedicalHistory(appointmentData.patientId ?? "");

  const effectivePatient =
    patient ||
    (appointmentData.patient as unknown as PatientWithMedicalHistory | undefined);

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
  /** Scroll spy fights browser scroll-on-focus; suppress briefly after focus moves within main. */
  const scrollSpySuppressedUntilRef = useRef(0);

  const computeActiveSectionFromScroll = useCallback(() => {
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
  }, []);

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

  const { flush, submitPrescriptions } = useConsultationAutosave({
    appointmentId,
    readOnly,
    clinicType,
    patientId: appointmentData.patientId,
  });

  useEffect(() => {
    if (!saveHandlesRef) return;
    saveHandlesRef.current = { flush, submitPrescriptions };
    return () => { saveHandlesRef.current = null; };
  }, [flush, saveHandlesRef, submitPrescriptions]);

  const selectSection = useCallback(
    (id: string) => {
      setActiveSectionId(id);
      const el = sectionRefs.current[id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.delete("tab");
      const firstId = sectionsRef.current[0]?.id ?? "subjective";
      if (id !== firstId) { next.set("section", id); } else { next.delete("section"); }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const sectionQ = searchParams.get("section");
  const tabQ = searchParams.get("tab");

  useEffect(() => {
    const resolved = resolveConsultationSectionFromUrl(sectionQ, tabQ, clinicType);
    const matchedResolved = resolved ? sections.find((s) => s.id === resolved) : undefined;
    const defaultSectionId = sections[0]?.id ?? "subjective";
    const valid = matchedResolved?.id ?? defaultSectionId;
    setActiveSectionId(valid);
    const wantsScrollFromUrl = Boolean(sectionQ?.trim() || tabQ);
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
    if (tabQ) { next.delete("tab"); changed = true; }
    if (valid !== defaultSectionId) {
      if (next.get("section") !== valid) { next.set("section", valid); changed = true; }
    } else if (next.has("section")) { next.delete("section"); changed = true; }
    if (changed) router.replace(`?${next.toString()}`, { scroll: false });
  }, [sectionQ, tabQ, clinicType, sectionIdsKey, router, searchParams, sections]);

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
        requestAnimationFrame(() => { pendingUrlScrollRef.current = null; computeActiveSectionFromScroll(); });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) { rafId = requestAnimationFrame(tick); }
      else { setPendingUrlScrollToSectionId(null); pendingUrlScrollRef.current = null; }
    };
    rafId = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [pendingUrlScrollToSectionId, computeActiveSectionFromScroll]);

  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root) return;
    const clearScrollSpySuppression = () => { scrollSpySuppressedUntilRef.current = 0; };
    scheduleScrollSpy();
    root.addEventListener("scroll", scheduleScrollSpy, { passive: true });
    window.addEventListener("resize", scheduleScrollSpy, { passive: true });
    root.addEventListener("wheel", clearScrollSpySuppression, { passive: true });
    root.addEventListener("touchstart", clearScrollSpySuppression, { passive: true });
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

  void useConsultationDraft((s) => s.dirty);
  void useConsultationDraft((s) => s.saveState);

  const onSaveClick = useCallback(async () => {
    await flush({ force: true });
    await submitPrescriptions();
  }, [flush, submitPrescriptions]);

  const focusNewItem = useCallback((kind: "c" | "d" | "m") => {
    const selectorMap: Record<"c" | "d" | "m", string> = {
      c: '[data-section-id="subjective"] input[placeholder*="complaint" i], [data-section-id="subjective"] input',
      d: '[data-section-id="assessment"] input',
      m: '[data-section-id="plan"] input',
    };
    const rootId = kind === "c" ? "subjective" : kind === "d" ? "assessment" : "plan";
    sectionRefs.current[rootId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { document.querySelector<HTMLInputElement>(selectorMap[kind])?.focus(); }, 300);
  }, []);

  const letterNavMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sections) map[s.letter.toLowerCase()] = s.id;
    return map;
  }, [sections]);

  const paletteActions = useMemo<CommandPaletteAction[]>(
    () => [
      ...sections.map((section) => ({
        id: `nav-${section.id}`,
        label: `Go to ${section.label}`,
        group: "Navigate" as const,
        icon: section.icon,
        shortcut: `g ${section.letter.toLowerCase()}`,
        onRun: () => selectSection(section.id),
      })),
      { id: "nav-opd-queue", label: "Back to OPD queue", group: "Navigate" as const, icon: ClipboardList, shortcut: "q", onRun: () => { void router.push("/consultation"); } },
      ...(patientLinkId && canViewPrescriptions ? ([{ id: "nav-patient-prescriptions", label: "Patient prescriptions", group: "Navigate" as const, icon: Pill, onRun: () => { void router.push(`/prescriptions?patientId=${encodeURIComponent(patientLinkId)}`); } }] satisfies CommandPaletteAction[]) : []),
      ...(patientLinkId && canAccess(Feature.LAB_TESTS) ? ([{ id: "nav-patient-labs", label: "Patient lab tests", group: "Navigate" as const, icon: FlaskConical, onRun: () => { void router.push(`/patients/${patientLinkId}?tab=records&subtab=labs`); } }] satisfies CommandPaletteAction[]) : []),
      ...(canManageTemplates ? ([{ id: "nav-templates", label: "Note templates", group: "Navigate" as const, icon: FileText, onRun: () => { void router.push("/templates"); } }] satisfies CommandPaletteAction[]) : []),
      { id: "add-complaint", label: "Add chief complaint", group: "Add" as const, shortcut: "n c", onRun: () => focusNewItem("c") },
      { id: "add-diagnosis", label: "Add diagnosis", group: "Add" as const, shortcut: "n d", onRun: () => focusNewItem("d") },
      { id: "add-medication", label: "Add medication", group: "Add" as const, shortcut: "n m", onRun: () => focusNewItem("m") },
      { id: "open-vitals", label: "Record vitals", group: "Action" as const, icon: HeartPulse, shortcut: "v", onRun: () => openVitals() },
      ...(readOnly ? [] : [{ id: "save-now", label: "Save consultation", group: "Action" as const, icon: Save, shortcut: "⌘ S", onRun: onSaveClick }]),
    ],
    [canAccess, canManageTemplates, canViewPrescriptions, focusNewItem, onSaveClick, openVitals, patientLinkId, readOnly, router, sections, selectSection],
  );

  useEffect(() => {
    const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === "k") { e.preventDefault(); onPaletteOpenChange(!paletteOpen); return; }
      if (modKey && e.key.toLowerCase() === "s") { if (readOnly) return; e.preventDefault(); void onSaveClick(); return; }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if (e.key === "?") { e.preventDefault(); onPaletteOpenChange(true); return; }
      if (e.key.toLowerCase() === "v") { e.preventDefault(); openVitals(); return; }
      if (e.key.toLowerCase() === "q") { e.preventDefault(); void router.push("/consultation"); return; }
      if (e.key === "g" || e.key === "n") {
        const mode = e.key;
        const sequenceHandler = (ev: KeyboardEvent) => {
          const key = ev.key.toLowerCase();
          if (mode === "g") { const id = letterNavMap[key]; if (id && sections.some((sec) => sec.id === id)) { ev.preventDefault(); selectSection(id); } }
          else if (mode === "n" && !readOnly) { if (key === "c" || key === "d" || key === "m") { ev.preventDefault(); focusNewItem(key); } }
          window.removeEventListener("keydown", sequenceHandler, true);
        };
        window.addEventListener("keydown", sequenceHandler, true);
        setTimeout(() => { window.removeEventListener("keydown", sequenceHandler, true); }, 1200);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusNewItem, letterNavMap, onPaletteOpenChange, onSaveClick, openVitals, paletteOpen, readOnly, router, sections, selectSection]);

  return {
    sections,
    clinicFeatures,
    activeSectionId,
    selectSection,
    mainScrollRef,
    setSectionRef,
    effectivePatient,
    patientLoading,
    paletteActions,
  };
}
