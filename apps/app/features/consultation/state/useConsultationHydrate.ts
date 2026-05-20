"use client";

import { useEffect } from "react";
import { logger } from "@/lib/monitoring/logger";
import {
  draftSessionStorageKey,
  hashDiagnosesForSync,
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/ChiefComplaintInput";
import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import type {
  CardiologyExamData,
  ClinicalInvestigation,
  DermatologyExamData,
  GrowthChartData,
  GynecologyExamData,
  OphthalmologyExamData,
  PsychiatryExamData,
} from "@workspace/types";
import type { DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";
import {
  buildChiefComplaintSeed,
  buildExaminationSeed,
  parseDiagnosis,
} from "./consultationHydrateHelpers";

interface HydrateOptions {
  appointmentId: string;
  appointmentData: Record<string, unknown> | null | undefined;
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
    const data = appointmentData as Record<string, unknown>;
    const chiefComplaint = buildChiefComplaintSeed(data);
    const examination = buildExaminationSeed(data);

    const diagnosis = parseDiagnosis(data["finalDiagnosis"]);
    const treatment =
      typeof data["treatmentPlan"] === "string"
        ? (data["treatmentPlan"] as string)
        : "";
    const history =
      typeof data["historyOfPresentIllness"] === "string"
        ? (data["historyOfPresentIllness"] as string)
        : "";
    const followUpPlan =
      typeof data["followUpPlan"] === "string"
        ? (data["followUpPlan"] as string)
        : "";
    const dentalChart = (data["dentalChart"] as DentalChartValue) || {};
    const eyeExam = (data["ophthalmologyExam"] as OphthalmologyExamData) || {};
    const growthData =
      (data["growthData"] as GrowthChartData) || {
        patientGender: "MALE",
        measurements: [],
      };

    const cardiologyExam = (data["cardiologyExam"] as CardiologyExamData) || {};
    const dermatologyExam =
      (data["dermatologyExam"] as DermatologyExamData) || {};
    const gynecologyExam = (data["gynecologyExam"] as GynecologyExamData) || {};
    const psychiatryExam = (data["psychiatryExam"] as PsychiatryExamData) || {};
    const investigations = Array.isArray(data["investigations"])
      ? (data["investigations"] as ClinicalInvestigation[])
      : [];

    const codedForHash = diagnosis
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
        chiefComplaint,
        history,
        examination,
        diagnosis,
        treatment,
        prescriptions: [],
        dentalChart,
        eyeExam,
        growthData,
        cardiologyExam,
        dermatologyExam,
        gynecologyExam,
        psychiatryExam,
        investigations,
        followUpPlan,
        diagnosesContentHash,
      });

      if (typeof window === "undefined") return;
      try {
        const stored = window.sessionStorage.getItem(
          draftSessionStorageKey(appointmentId),
        );
        if (!stored) return;
        if (cancelled) return;
        const parsed = JSON.parse(stored) as
          | {
              savedAt?: number;
              chiefComplaint?: ChiefComplaintItem[];
              history?: string;
              examination?: ExaminationData;
              diagnosis?: DiagnosisItem[];
              treatment?: string;
              followUpPlan?: string;
              dentalChart?: DentalChartValue;
              eyeExam?: OphthalmologyExamData;
              growthData?: GrowthChartData;
              cardiologyExam?: CardiologyExamData;
              dermatologyExam?: DermatologyExamData;
              gynecologyExam?: GynecologyExamData;
              psychiatryExam?: PsychiatryExamData;
              investigations?: ClinicalInvestigation[];
            }
          | null;
        if (!parsed) return;
        const serverUpdatedAt =
          typeof data["updatedAt"] === "string"
            ? new Date(data["updatedAt"] as string).getTime()
            : 0;
        if (
          !parsed.savedAt ||
          (serverUpdatedAt && parsed.savedAt <= serverUpdatedAt)
        ) {
          window.sessionStorage.removeItem(
            draftSessionStorageKey(appointmentId),
          );
          return;
        }
        useConsultationDraft.setState((state) => ({
          chiefComplaint: parsed.chiefComplaint ?? state.chiefComplaint,
          history: parsed.history ?? state.history,
          examination: parsed.examination ?? state.examination,
          diagnosis: parsed.diagnosis ?? state.diagnosis,
          treatment: parsed.treatment ?? state.treatment,
          followUpPlan: parsed.followUpPlan ?? state.followUpPlan,
          dentalChart: parsed.dentalChart ?? state.dentalChart,
          eyeExam: parsed.eyeExam ?? state.eyeExam,
          growthData: parsed.growthData ?? state.growthData,
          cardiologyExam: parsed.cardiologyExam ?? state.cardiologyExam,
          dermatologyExam: parsed.dermatologyExam ?? state.dermatologyExam,
          gynecologyExam: parsed.gynecologyExam ?? state.gynecologyExam,
          psychiatryExam: parsed.psychiatryExam ?? state.psychiatryExam,
          investigations: parsed.investigations ?? state.investigations,
          dirty: true,
          saveState: "dirty",
        }));
      } catch (error) {
        logger.warn("Failed to restore consultation draft from sessionStorage", {
          error,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, appointmentData]);
}
