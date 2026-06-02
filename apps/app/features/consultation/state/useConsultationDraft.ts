"use client";

import { create } from "zustand";
import {
  DEFAULT_CONSULTATION_DRAFT_STATE,
  draftSessionStorageKey,
  hashDiagnosesForSync,
  resolveDraftUpdater,
} from "./consultationDraftHelpers";
import type {
  ConsultationDraftActions,
  ConsultationDraftState,
  ConsultationDraftStore,
  SaveState,
} from "./consultation-draft.types";

export type {
  ConsultationDraftActions,
  ConsultationDraftState,
  ConsultationDraftStore,
  SaveState,
};

/** Aligns leave navigation, history traps, and `beforeunload` warnings. */
export function consultationDraftNeedsLeaveGuard(
  s: Pick<ConsultationDraftState, "dirty" | "saveState">,
): boolean {
  return s.dirty || s.saveState === "error" || s.saveState === "saving";
}

export const useConsultationDraft = create<ConsultationDraftStore>((set) => ({
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
}));

/**
 * Canonical content-hash for the diagnoses array. Matches
 * `AppointmentService.hashDiagnosesContent`: SHA-256 of JSON-encoded rows sorted by
 * `icdCodeId`, with trimmed notes and boolean `isPrimary`, first 32 hex chars.
 */
export { draftSessionStorageKey, hashDiagnosesForSync };
