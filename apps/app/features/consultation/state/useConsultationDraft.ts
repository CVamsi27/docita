"use client";

import { create } from "zustand";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/ChiefComplaintInput";
import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import type { Medication } from "@/features/consultation/components/structured/PrescriptionInput";
import type { DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";
import type {
  CardiologyExamData,
  ClinicalInvestigation,
  DermatologyExamData,
  GrowthChartData,
  GynecologyExamData,
  OphthalmologyExamData,
  PsychiatryExamData,
} from "@workspace/types";
import {
  DEFAULT_CONSULTATION_DRAFT_STATE,
  draftSessionStorageKey,
  hashDiagnosesForSync,
  resolveDraftUpdater,
} from "./consultationDraftHelpers";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface ConsultationDraftState {
  appointmentId: string | null;
  chiefComplaint: ChiefComplaintItem[];
  history: string;
  examination: ExaminationData;
  diagnosis: DiagnosisItem[];
  treatment: string;
  prescriptions: Medication[];
  dentalChart: DentalChartValue;
  eyeExam: OphthalmologyExamData;
  growthData: GrowthChartData;
  cardiologyExam: CardiologyExamData;
  dermatologyExam: DermatologyExamData;
  gynecologyExam: GynecologyExamData;
  psychiatryExam: PsychiatryExamData;
  investigations: ClinicalInvestigation[];
  followUpPlan: string;
  dirty: boolean;
  saveState: SaveState;
  lastSavedAt: number | null;
  lastError: string | null;
  diagnosesContentHash: string | null;
}

export interface ConsultationDraftActions {
  hydrate: (
    appointmentId: string,
    seed: Partial<Omit<ConsultationDraftState, "appointmentId">>,
  ) => void;
  setChiefComplaint: (
    updater:
      | ChiefComplaintItem[]
      | ((prev: ChiefComplaintItem[]) => ChiefComplaintItem[]),
  ) => void;
  setHistory: (updater: string | ((prev: string) => string)) => void;
  setExamination: (
    updater: ExaminationData | ((prev: ExaminationData) => ExaminationData),
  ) => void;
  setDiagnosis: (
    updater: DiagnosisItem[] | ((prev: DiagnosisItem[]) => DiagnosisItem[]),
  ) => void;
  setTreatment: (updater: string | ((prev: string) => string)) => void;
  setPrescriptions: (
    updater: Medication[] | ((prev: Medication[]) => Medication[]),
  ) => void;
  setDentalChart: (
    updater:
      | DentalChartValue
      | ((prev: DentalChartValue) => DentalChartValue),
  ) => void;
  setEyeExam: (
    updater:
      | OphthalmologyExamData
      | ((prev: OphthalmologyExamData) => OphthalmologyExamData),
  ) => void;
  setGrowthData: (
    updater:
      | GrowthChartData
      | ((prev: GrowthChartData) => GrowthChartData),
  ) => void;
  setFollowUpPlan: (updater: string | ((prev: string) => string)) => void;
  setCardiologyExam: (
    updater:
      | CardiologyExamData
      | ((prev: CardiologyExamData) => CardiologyExamData),
  ) => void;
  setDermatologyExam: (
    updater:
      | DermatologyExamData
      | ((prev: DermatologyExamData) => DermatologyExamData),
  ) => void;
  setGynecologyExam: (
    updater:
      | GynecologyExamData
      | ((prev: GynecologyExamData) => GynecologyExamData),
  ) => void;
  setPsychiatryExam: (
    updater:
      | PsychiatryExamData
      | ((prev: PsychiatryExamData) => PsychiatryExamData),
  ) => void;
  setInvestigations: (
    updater:
      | ClinicalInvestigation[]
      | ((
          prev: ClinicalInvestigation[],
        ) => ClinicalInvestigation[]),
  ) => void;
  markClean: (savedAt?: number) => void;
  markSaving: () => void;
  markError: (message: string) => void;
  setDiagnosesContentHash: (hash: string | null) => void;
  /** Clears dirty/error/saving guard without persisting; use when abandoning edits for leave navigation. */
  clearConsultationLeaveGuard: () => void;
  reset: () => void;
}

export type ConsultationDraftStore = ConsultationDraftState &
  ConsultationDraftActions;

/** Aligns leave navigation, history traps, and `beforeunload` warnings. */
export function consultationDraftNeedsLeaveGuard(
  s: Pick<ConsultationDraftState, "dirty" | "saveState">,
): boolean {
  return s.dirty || s.saveState === "error" || s.saveState === "saving";
}

export const useConsultationDraft = create<ConsultationDraftStore>(
  (set) => ({
    ...DEFAULT_CONSULTATION_DRAFT_STATE,

    hydrate: (appointmentId, seed) =>
      set(() => ({
        ...DEFAULT_CONSULTATION_DRAFT_STATE,
        ...seed,
        appointmentId,
        dirty: false,
        saveState: "idle",
      })),

    setChiefComplaint: (updater) =>
      set((state) => ({
        chiefComplaint: resolveDraftUpdater(updater, state.chiefComplaint),
        dirty: true,
        saveState: "dirty",
      })),

    setHistory: (updater) =>
      set((state) => ({
        history: resolveDraftUpdater(updater, state.history),
        dirty: true,
        saveState: "dirty",
      })),

    setExamination: (updater) =>
      set((state) => ({
        examination: resolveDraftUpdater(updater, state.examination),
        dirty: true,
        saveState: "dirty",
      })),

    setDiagnosis: (updater) =>
      set((state) => ({
        diagnosis: resolveDraftUpdater(updater, state.diagnosis),
        dirty: true,
        saveState: "dirty",
      })),

    setTreatment: (updater) =>
      set((state) => ({
        treatment: resolveDraftUpdater(updater, state.treatment),
        dirty: true,
        saveState: "dirty",
      })),

    setPrescriptions: (updater) =>
      set((state) => ({
        prescriptions: resolveDraftUpdater(updater, state.prescriptions),
        dirty: true,
        saveState: "dirty",
      })),

    setDentalChart: (updater) =>
      set((state) => ({
        dentalChart: resolveDraftUpdater(updater, state.dentalChart),
        dirty: true,
        saveState: "dirty",
      })),

    setEyeExam: (updater) =>
      set((state) => ({
        eyeExam: resolveDraftUpdater(updater, state.eyeExam),
        dirty: true,
        saveState: "dirty",
      })),

    setGrowthData: (updater) =>
      set((state) => ({
        growthData: resolveDraftUpdater(updater, state.growthData),
        dirty: true,
        saveState: "dirty",
      })),

    setFollowUpPlan: (updater) =>
      set((state) => ({
        followUpPlan: resolveDraftUpdater(updater, state.followUpPlan),
        dirty: true,
        saveState: "dirty",
      })),

    setCardiologyExam: (updater) =>
      set((state) => ({
        cardiologyExam: resolveDraftUpdater(updater, state.cardiologyExam),
        dirty: true,
        saveState: "dirty",
      })),

    setDermatologyExam: (updater) =>
      set((state) => ({
        dermatologyExam: resolveDraftUpdater(updater, state.dermatologyExam),
        dirty: true,
        saveState: "dirty",
      })),

    setGynecologyExam: (updater) =>
      set((state) => ({
        gynecologyExam: resolveDraftUpdater(updater, state.gynecologyExam),
        dirty: true,
        saveState: "dirty",
      })),

    setPsychiatryExam: (updater) =>
      set((state) => ({
        psychiatryExam: resolveDraftUpdater(updater, state.psychiatryExam),
        dirty: true,
        saveState: "dirty",
      })),

    setInvestigations: (updater) =>
      set((state) => ({
        investigations: resolveDraftUpdater(updater, state.investigations),
        dirty: true,
        saveState: "dirty",
      })),

    markClean: (savedAt) =>
      set(() => ({
        dirty: false,
        saveState: "saved",
        lastSavedAt: savedAt ?? Date.now(),
        lastError: null,
      })),

    markSaving: () =>
      set(() => ({
        saveState: "saving",
      })),

    markError: (message) =>
      set(() => ({
        saveState: "error",
        lastError: message,
      })),

    setDiagnosesContentHash: (hash) =>
      set(() => ({
        diagnosesContentHash: hash,
      })),

    clearConsultationLeaveGuard: () =>
      set(() => ({
        dirty: false,
        saveState: "idle",
        lastError: null,
      })),

    reset: () => set(() => ({ ...DEFAULT_CONSULTATION_DRAFT_STATE })),
  }),
);

/**
 * Canonical content-hash for the diagnoses array. Matches
 * `AppointmentService.hashDiagnosesContent`: SHA-256 of JSON-encoded rows sorted by
 * `icdCodeId`, with trimmed notes and boolean `isPrimary`, first 32 hex chars.
 */
export { draftSessionStorageKey, hashDiagnosesForSync };
