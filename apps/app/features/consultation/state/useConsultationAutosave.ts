"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useUpdateAppointment } from "@/hooks/api/use-appointments";
import { useSyncDiagnoses } from "@/hooks/api/use-appointments";
import { useCreatePrescription } from "@/hooks/api/use-clinical";
import { logger } from "@/lib/logger";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  consultationDraftNeedsLeaveGuard,
  hashDiagnosesForSync,
  useConsultationDraft,
  draftSessionStorageKey,
} from "@/features/consultation/state/useConsultationDraft";
import { getConsultationPersistKeysForClinic } from "@/features/consultation/workspace/consultation-section-registry";
import type { UpdateAppointmentRequest } from "@workspace/types";

const AUTOSAVE_DEBOUNCE_MS = 800;

interface UseConsultationAutosaveOptions {
  appointmentId: string;
  readOnly?: boolean;
  clinicType?: string;
  patientId?: string;
}

export function useConsultationAutosave(options: UseConsultationAutosaveOptions) {
  const { appointmentId, readOnly, clinicType, patientId } = options;

  const updateAppointment = useUpdateAppointment(appointmentId);
  const syncDiagnoses = useSyncDiagnoses(appointmentId);
  const createPrescription = useCreatePrescription();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const failureStreakRef = useRef(0);

  const getDraft = useConsultationDraft.getState;

  const persistToSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const state = getDraft();
      if (!state.appointmentId) return;
      const payload = JSON.stringify({
        chiefComplaint: state.chiefComplaint,
        history: state.history,
        examination: state.examination,
        diagnosis: state.diagnosis,
        treatment: state.treatment,
        prescriptions: state.prescriptions,
        dentalChart: state.dentalChart,
        eyeExam: state.eyeExam,
        growthData: state.growthData,
        cardiologyExam: state.cardiologyExam,
        dermatologyExam: state.dermatologyExam,
        gynecologyExam: state.gynecologyExam,
        psychiatryExam: state.psychiatryExam,
        investigations: state.investigations,
        followUpPlan: state.followUpPlan,
        savedAt: Date.now(),
      });
      window.sessionStorage.setItem(
        draftSessionStorageKey(state.appointmentId),
        payload,
      );
    } catch (error) {
      logger.warn("Failed to persist consultation draft to sessionStorage", {
        error,
      });
    }
  }, [getDraft]);

  const buildAppointmentPatch = useCallback((): UpdateAppointmentRequest => {
    const state = getDraft();
    const chiefComplaintText = state.chiefComplaint
      .map((c) => c.complaint)
      .filter((c) => c && c.trim())
      .join(", ");

    const systemicExamination: Record<string, unknown> = {
      cvs: { notes: state.examination.systemic.cvs },
      rs: { notes: state.examination.systemic.rs },
      pa: { notes: state.examination.systemic.pa },
      cns: { notes: state.examination.systemic.cns },
      additionalNotes: state.examination.systemic.notes,
    };
    const ms = state.examination.systemic.musculoskeletal?.trim();
    if (ms) {
      systemicExamination.mss = { jointExamination: ms };
    }

    const patch = {
      chiefComplaint: chiefComplaintText,
      historyOfPresentIllness: state.history,
      treatmentPlan: state.treatment,
      finalDiagnosis: JSON.stringify(state.diagnosis),
      followUpPlan: state.followUpPlan,
      generalExamination: state.examination.general,
      systemicExamination,
    } as unknown as UpdateAppointmentRequest;

    const persistKeys = getConsultationPersistKeysForClinic(clinicType);
    for (const key of persistKeys) {
      switch (key) {
        case "dentalChart":
          patch.dentalChart = state.dentalChart;
          break;
        case "ophthalmologyExam":
          patch.ophthalmologyExam = state.eyeExam;
          break;
        case "growthData":
          patch.growthData = state.growthData;
          break;
        case "cardiologyExam":
          patch.cardiologyExam = state.cardiologyExam;
          break;
        case "dermatologyExam":
          patch.dermatologyExam = state.dermatologyExam;
          break;
        case "gynecologyExam":
          patch.gynecologyExam = state.gynecologyExam;
          break;
        case "psychiatryExam":
          patch.psychiatryExam = state.psychiatryExam;
          break;
        case "investigations":
          patch.investigations = state.investigations;
          break;
        default:
          break;
      }
    }

    return patch;
  }, [clinicType, getDraft]);

  /**
   * Flush current draft to the server. Returns whether a flush actually ran.
   * Safe to call multiple times — re-entry while already saving is ignored.
   */
  const flush = useCallback(
    async (options: { force?: boolean } = {}): Promise<boolean> => {
      if (readOnly) return false;
      if (!appointmentId) return false;
      if (inFlightRef.current) return false;

      const state = getDraft();
      if (!state.dirty && !options.force) return false;

      inFlightRef.current = true;
      useConsultationDraft.setState({ saveState: "saving" });

      try {
        const patch = buildAppointmentPatch();
        await updateAppointment.mutateAsync(patch);

        const codedDiagnoses = state.diagnosis
          .filter((d) => d.icdCode?.id)
          .map((d, idx) => ({
            icdCodeId: d.icdCode?.id,
            notes: d.notes,
            isPrimary: idx === 0,
          }));
        const nextHash = hashDiagnosesForSync(codedDiagnoses);
        const prevHash = state.diagnosesContentHash;

        if (codedDiagnoses.length > 0 && nextHash !== prevHash) {
          await syncDiagnoses.mutateAsync({
            diagnoses: codedDiagnoses,
            contentHash: nextHash,
          });
          useConsultationDraft.getState().setDiagnosesContentHash(nextHash);
        } else if (codedDiagnoses.length === 0 && prevHash) {
          await syncDiagnoses.mutateAsync({
            diagnoses: [],
            contentHash: nextHash,
          });
          useConsultationDraft.getState().setDiagnosesContentHash(nextHash);
        }

        failureStreakRef.current = 0;
        useConsultationDraft.getState().markClean();
        persistToSession();
        return true;
      } catch (error) {
        failureStreakRef.current += 1;
        const message =
          error instanceof Error
            ? error.message
            : "Could not save consultation draft.";
        useConsultationDraft.getState().markError(message);
        if (failureStreakRef.current >= 2) {
          showUserFacingErrorToast(message);
        } else {
          logger.warn("Consultation autosave failed", { error });
        }
        return false;
      } finally {
        inFlightRef.current = false;
      }
    },
    [
      appointmentId,
      buildAppointmentPatch,
      getDraft,
      persistToSession,
      readOnly,
      syncDiagnoses,
      updateAppointment,
    ],
  );

  /**
   * Submit prescriptions as a separate workflow. Only fires when the draft
   * actually has medications to send.
   */
  const submitPrescriptions = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    const state = getDraft();
    if (state.prescriptions.length === 0 || !patientId || !appointmentId) {
      return false;
    }
    try {
      await createPrescription.mutateAsync({
        patientId,
        appointmentId,
        medications: state.prescriptions.map((p) => ({
          name: p.name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route || "PO",
          prnInstructions: "",
          instructions: p.instructions || undefined,
        })),
      });
      return true;
    } catch (error) {
      logger.warn("Prescription submission failed", { error });
      const message =
        error instanceof Error
          ? error.message
          : "Could not create prescription.";
      showUserFacingErrorToast(message);
      return false;
    }
  }, [appointmentId, createPrescription, getDraft, patientId, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const unsubscribe = useConsultationDraft.subscribe((state, prevState) => {
      if (!state.dirty) return;
      if (state.saveState === "saving") return;
      if (state === prevState) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      persistToSession();
      debounceTimer.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [flush, persistToSession, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (consultationDraftNeedsLeaveGuard(useConsultationDraft.getState())) {
        persistToSession();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistToSession, readOnly]);

  return useMemo(
    () => ({ flush, submitPrescriptions }),
    [flush, submitPrescriptions],
  );
}
