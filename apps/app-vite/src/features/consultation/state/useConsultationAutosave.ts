// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import {
  useConsultationAutosaveUpdateAppointment,
  useSyncDiagnoses,
} from "@workspace/data-access";
import { useCreatePrescription } from "@workspace/data-access";
import { logger } from "@/lib/monitoring/logger";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  consultationDraftNeedsLeaveGuard,
  hashDiagnosesForSync,
  useConsultationDraft,
  draftSessionStorageKey,
} from "@/features/consultation/state/useConsultationDraft";
import { buildConsultationAppointmentPatch } from "@/features/consultation/state/consultation-autosave-patch";
import {
  AUTOSAVE_DEBOUNCE_MS,
  serializeDraftForSession,
  buildCodedDiagnoses,
} from "./consultation-autosave-helpers";

export function useConsultationAutosave(
  options: {
    appointmentId: string;
    readOnly?: boolean;
    clinicType?: string;
    patientId?: string;
  },
) {
  const { appointmentId, readOnly, clinicType, patientId } = options;

  const queryClient = useQueryClient();
  const updateAppointment =
    useConsultationAutosaveUpdateAppointment(appointmentId);
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
      const payload = serializeDraftForSession(state);
      if (!payload) return;
      window.sessionStorage.setItem(
        draftSessionStorageKey(state.appointmentId!),
        payload,
      );
    } catch (error) {
      logger.warn("Failed to persist consultation draft to sessionStorage", {
        error,
      });
    }
  }, [getDraft]);

  const buildAppointmentPatch = useCallback(
    () => buildConsultationAppointmentPatch(getDraft(), clinicType),
    [clinicType, getDraft],
  );

  const markCleanAndClearSession = useCallback(() => {
    useConsultationDraft.getState().markClean();
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(draftSessionStorageKey(appointmentId));
    } catch (error) {
      logger.warn("Failed to clear consultation draft session key", {
        error,
      });
    }
  }, [appointmentId]);

  const syncDraftDiagnoses = useCallback(
    async (
      diagnosis: ReturnType<typeof getDraft>["diagnosis"],
      prevHash: string | null,
    ) => {
      const codedDiagnoses = buildCodedDiagnoses(diagnosis);
      const nextHash = await hashDiagnosesForSync(codedDiagnoses);
      if (
        (codedDiagnoses.length > 0 && nextHash !== prevHash) ||
        (codedDiagnoses.length === 0 && prevHash)
      ) {
        await syncDiagnoses.mutateAsync({
          diagnoses: codedDiagnoses,
          contentHash: nextHash,
        });
        useConsultationDraft.getState().setDiagnosesContentHash(nextHash);
      }
    },
    [syncDiagnoses],
  );

  const flush = useCallback(
    async (options: { force?: boolean } = {}): Promise<boolean> => {
      if (readOnly || !appointmentId || inFlightRef.current) return false;
      const state = getDraft();
      if (!state.dirty && !options.force) return false;

      inFlightRef.current = true;
      useConsultationDraft.setState({ saveState: "saving" });

      try {
        const patch = buildAppointmentPatch();
        const sentFingerprint = JSON.stringify(patch);
        const updated = await updateAppointment.mutateAsync(patch);
        queryClient.setQueryData(
          queryKeys.appointments.detail(appointmentId),
          updated,
        );
        if (patientId)
          void queryClient.invalidateQueries({
            queryKey: queryKeys.patientTimeline.prefix(patientId),
            exact: false,
          });

        await syncDraftDiagnoses(state.diagnosis, state.diagnosesContentHash);

        failureStreakRef.current = 0;
        inFlightRef.current = false;
        if (JSON.stringify(buildAppointmentPatch()) !== sentFingerprint) {
          useConsultationDraft.setState({
            dirty: true,
            saveState: "dirty",
            lastError: null,
          });
        } else {
          markCleanAndClearSession();
        }
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
        if (inFlightRef.current) inFlightRef.current = false;
      }
    },
    [
      appointmentId,
      buildAppointmentPatch,
      getDraft,
      markCleanAndClearSession,
      patientId,
      queryClient,
      readOnly,
      syncDraftDiagnoses,
      updateAppointment,
    ],
  );

  const submitPrescriptions = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    const state = getDraft();
    if (state.prescriptions.length === 0 || !patientId || !appointmentId)
      return false;
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
    const unsubscribe = useConsultationDraft.subscribe((state) => {
      if (!state.dirty) return;
      if (inFlightRef.current) return;
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
