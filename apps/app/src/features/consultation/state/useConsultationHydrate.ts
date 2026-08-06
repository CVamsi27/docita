import { useEffect } from "react";
import { logger } from "@/lib/monitoring/logger";
import {
  draftSessionStorageKey,
  hashDiagnosesForSync,
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";
import {
  applyConsultationSessionDraft,
  buildConsultationHydrateSeed,
  consultationDraftSessionSchema,
  toRecord,
} from "./consultation-hydrate-helpers";

interface HydrateOptions {
  appointmentId: string;
  appointmentData: unknown;
}

export function useConsultationHydrate({
  appointmentId,
  appointmentData,
}: HydrateOptions): void {
  useEffect(() => {
    if (!appointmentId || !appointmentData) return;

    const draft = useConsultationDraft.getState();
    if (draft.dirty && draft.appointmentId === appointmentId) {
      return;
    }

    let cancelled = false;
    const data = toRecord(appointmentData);
    const seed = buildConsultationHydrateSeed(data);

    const codedForHash = seed.diagnosis
      .filter((d) => d.icdCode?.id)
      .map((d, idx) => ({
        icdCodeId: d.icdCode?.id,
        notes: d.notes,
        isPrimary: idx === 0,
      }));

    void (async () => {
      const diagnosesContentHash = await hashDiagnosesForSync(codedForHash);
      if (cancelled) return;

      useConsultationDraft.getState().hydrate(appointmentId, {
        chiefComplaint: seed.chiefComplaint,
        history: seed.history,
        examination: seed.examination,
        diagnosis: seed.diagnosis,
        treatment: seed.treatment,
        prescriptions: [],
        dentalChart: seed.dentalChart,
        eyeExam: seed.eyeExam,
        growthData: seed.growthData,
        cardiologyExam: seed.cardiologyExam,
        dermatologyExam: seed.dermatologyExam,
        gynecologyExam: seed.gynecologyExam,
        psychiatryExam: seed.psychiatryExam,
        investigations: seed.investigations,
        followUpPlan: seed.followUpPlan,
        diagnosesContentHash,
      });

      if (typeof window === "undefined") return;
      try {
        const stored = window.sessionStorage.getItem(
          draftSessionStorageKey(appointmentId),
        );
        if (!stored) return;
        if (cancelled) return;

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(stored);
        } catch {
          return;
        }

        const parsed = consultationDraftSessionSchema.safeParse(parsedJson);
        if (!parsed.success) return;

        const sessionDraft = parsed.data;
        // Absolute TTL: drafts older than 24h are purged regardless of
        // server state. The sessionStorage value contains PHI (chief
        // complaint, history, examination, diagnoses, prescriptions);
        // capping dwell time limits exposure if the device is reused.
        const SESSION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
        const isStaleByTtl =
          typeof sessionDraft.savedAt === "number" &&
          Date.now() - sessionDraft.savedAt > SESSION_DRAFT_TTL_MS;
        if (
          !sessionDraft.savedAt ||
          isStaleByTtl ||
          (seed.serverUpdatedAtMs &&
            sessionDraft.savedAt <= seed.serverUpdatedAtMs)
        ) {
          window.sessionStorage.removeItem(
            draftSessionStorageKey(appointmentId),
          );
          return;
        }

        useConsultationDraft.setState((state) =>
          applyConsultationSessionDraft(state, sessionDraft),
        );
      } catch (error) {
        logger.warn(
          "Failed to restore consultation draft from sessionStorage",
          {
            error,
          },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, appointmentData]);
}
