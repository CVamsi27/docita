"use client";

import { useEffect } from "react";
import { parseChiefComplaintsFromAppointmentData } from "@workspace/utils";
import { logger } from "@/lib/logger";
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

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value));
}

function nestedSystemicNotes(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = toRecord(raw);
    if (typeof obj.notes === "string") return obj.notes;
  }
  return "";
}

function ensureString(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = toRecord(val);
    if ("notes" in obj && typeof obj.notes === "string") return obj.notes;
    return JSON.stringify(val);
  }
  if (val === null || val === undefined) return "";
  return String(val);
}

function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as DiagnosisItem[];
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DiagnosisItem[];
    if (typeof parsed === "string" && parsed.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: parsed,
          type: "provisional",
          status: "active",
        },
      ];
    }
  } catch {
    if (raw.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: raw,
          type: "provisional",
          status: "active",
        },
      ];
    }
  }
  return [];
}

function normalizeComplaintList(
  items: ChiefComplaintItem[] | undefined,
): ChiefComplaintItem[] {
  if (!items || items.length === 0) return [];
  return items.map((item) => ({
    ...item,
    durationValue:
      item.complaint?.trim() && (!item.durationValue || !item.durationValue.trim())
        ? "1"
        : item.durationValue,
  }));
}

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
    const structured = data["chiefComplaintStructured"] as
      | ChiefComplaintItem[]
      | undefined;
    const jsonRows = parseChiefComplaintsFromAppointmentData(data);

    let chiefComplaint: ChiefComplaintItem[];
    if (structured?.length) {
      chiefComplaint = normalizeComplaintList(structured);
    } else if (jsonRows.length > 0) {
      chiefComplaint = normalizeComplaintList(
        jsonRows.map((row) => ({
          id: row.id ?? crypto.randomUUID(),
          complaint: row.complaint ?? "",
          durationValue: row.durationValue?.trim() ? row.durationValue : "1",
          durationUnit: row.durationUnit ?? "days",
          severity: row.severity || "moderate",
          notes: row.notes,
        })),
      );
    } else {
      const rawComplaint =
        typeof data["chiefComplaint"] === "string"
          ? (data["chiefComplaint"] as string).trim()
          : "";
      chiefComplaint = rawComplaint
        ? [
            {
              id: "legacy",
              complaint: rawComplaint,
              durationValue: "1",
              durationUnit: "days",
              severity: "moderate",
            },
          ]
        : [];
    }

    const genExam = data["generalExamination"];
    const sysExam = data["systemicExamination"];
    const sysRecord = sysExam ? toRecord(sysExam) : {};
    const mssRaw = sysRecord["mss"];
    let musculoskeletalFromMss = "";
    if (mssRaw && typeof mssRaw === "object") {
      const mss = toRecord(mssRaw);
      musculoskeletalFromMss = [
        typeof mss["jointExamination"] === "string"
          ? (mss["jointExamination"] as string)
          : "",
        typeof mss["notes"] === "string" ? (mss["notes"] as string) : "",
        typeof mss["muscleStrength"] === "string"
          ? (mss["muscleStrength"] as string)
          : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    const genRecord =
      genExam && typeof genExam === "object"
        ? toRecord(genExam as object)
        : {};
    const generalNotesFromApi =
      typeof genRecord["generalNotes"] === "string"
        ? genRecord["generalNotes"]
        : "";
    const generalNotesUi =
      typeof genRecord["notes"] === "string" ? genRecord["notes"] : "";
    const { generalNotes: _gn, notes: _n, ...generalRest } = genRecord;

    const examination: ExaminationData = {
      general: genExam
        ? {
            ...DEFAULT_EXAMINATION.general,
            ...(generalRest as object),
            notes: generalNotesUi || generalNotesFromApi,
          }
        : DEFAULT_EXAMINATION.general,
      systemic: sysExam
        ? {
            cvs: nestedSystemicNotes(sysRecord["cvs"]),
            rs: nestedSystemicNotes(sysRecord["rs"]),
            pa: nestedSystemicNotes(sysRecord["pa"]),
            cns: nestedSystemicNotes(sysRecord["cns"]),
            musculoskeletal:
              musculoskeletalFromMss ||
              (typeof sysRecord["musculoskeletal"] === "string"
                ? sysRecord["musculoskeletal"]
                : ""),
            notes: ensureString(sysRecord["additionalNotes"]),
          }
        : DEFAULT_EXAMINATION.systemic,
    };

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
