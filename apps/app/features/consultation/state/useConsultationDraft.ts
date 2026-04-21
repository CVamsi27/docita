"use client";

import { create } from "zustand";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/ChiefComplaintInput";
import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import type { Medication } from "@/features/consultation/components/structured/PrescriptionInput";
import type { DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";
import type {
  GrowthChartData,
  OphthalmologyExamData,
} from "@workspace/types";

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
  markClean: (savedAt?: number) => void;
  markSaving: () => void;
  markError: (message: string) => void;
  setDiagnosesContentHash: (hash: string | null) => void;
  reset: () => void;
}

export type ConsultationDraftStore = ConsultationDraftState &
  ConsultationDraftActions;

const DEFAULT_EXAMINATION: ExaminationData = {
  general: {
    pallor: false,
    icterus: false,
    cyanosis: false,
    clubbing: false,
    lymphadenopathy: false,
    edema: false,
    notes: "",
  },
  systemic: {
    cvs: "",
    rs: "",
    pa: "",
    cns: "",
    musculoskeletal: "",
    notes: "",
  },
};

const DEFAULT_GROWTH: GrowthChartData = {
  patientGender: "MALE",
  measurements: [],
};

const DEFAULT_STATE: ConsultationDraftState = {
  appointmentId: null,
  chiefComplaint: [],
  history: "",
  examination: DEFAULT_EXAMINATION,
  diagnosis: [],
  treatment: "",
  prescriptions: [],
  dentalChart: {},
  eyeExam: {},
  growthData: DEFAULT_GROWTH,
  followUpPlan: "",
  dirty: false,
  saveState: "idle",
  lastSavedAt: null,
  lastError: null,
  diagnosesContentHash: null,
};

function resolveUpdater<T>(updater: T | ((prev: T) => T), prev: T): T {
  return typeof updater === "function"
    ? (updater as (prev: T) => T)(prev)
    : updater;
}

export const useConsultationDraft = create<ConsultationDraftStore>(
  (set) => ({
    ...DEFAULT_STATE,

    hydrate: (appointmentId, seed) =>
      set(() => ({
        ...DEFAULT_STATE,
        ...seed,
        appointmentId,
        dirty: false,
        saveState: "idle",
      })),

    setChiefComplaint: (updater) =>
      set((state) => ({
        chiefComplaint: resolveUpdater(updater, state.chiefComplaint),
        dirty: true,
        saveState: "dirty",
      })),

    setHistory: (updater) =>
      set((state) => ({
        history: resolveUpdater(updater, state.history),
        dirty: true,
        saveState: "dirty",
      })),

    setExamination: (updater) =>
      set((state) => ({
        examination: resolveUpdater(updater, state.examination),
        dirty: true,
        saveState: "dirty",
      })),

    setDiagnosis: (updater) =>
      set((state) => ({
        diagnosis: resolveUpdater(updater, state.diagnosis),
        dirty: true,
        saveState: "dirty",
      })),

    setTreatment: (updater) =>
      set((state) => ({
        treatment: resolveUpdater(updater, state.treatment),
        dirty: true,
        saveState: "dirty",
      })),

    setPrescriptions: (updater) =>
      set((state) => ({
        prescriptions: resolveUpdater(updater, state.prescriptions),
        dirty: true,
        saveState: "dirty",
      })),

    setDentalChart: (updater) =>
      set((state) => ({
        dentalChart: resolveUpdater(updater, state.dentalChart),
        dirty: true,
        saveState: "dirty",
      })),

    setEyeExam: (updater) =>
      set((state) => ({
        eyeExam: resolveUpdater(updater, state.eyeExam),
        dirty: true,
        saveState: "dirty",
      })),

    setGrowthData: (updater) =>
      set((state) => ({
        growthData: resolveUpdater(updater, state.growthData),
        dirty: true,
        saveState: "dirty",
      })),

    setFollowUpPlan: (updater) =>
      set((state) => ({
        followUpPlan: resolveUpdater(updater, state.followUpPlan),
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

    reset: () => set(() => ({ ...DEFAULT_STATE })),
  }),
);

/**
 * Canonical content-hash for the diagnoses array. Uses FNV-1a on a deterministic
 * projection so the hash matches what the backend computes (ordering by
 * icdCodeId, normalized notes + isPrimary flag).
 */
export function hashDiagnosesForSync(
  items: Array<{
    icdCodeId?: string;
    notes?: string;
    isPrimary?: boolean;
  }>,
): string {
  const normalized = items
    .filter((d) => d.icdCodeId)
    .map((d) => ({
      icdCodeId: d.icdCodeId,
      notes: (d.notes ?? "").trim(),
      isPrimary: Boolean(d.isPrimary),
    }))
    .sort((a, b) => (a.icdCodeId! > b.icdCodeId! ? 1 : -1));

  const json = JSON.stringify(normalized);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function draftSessionStorageKey(appointmentId: string): string {
  return `docita:consultation-draft:${appointmentId}`;
}
