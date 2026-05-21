import { z } from "zod";
import {
  cardiologyExamDataSchema,
  chiefComplaintDraftItemSchema,
  clinicalInvestigationSchema,
  dentalChartSchema,
  dermatologyExamDataSchema,
  diagnosisDraftItemSchema,
  examinationDraftSchema,
  growthChartDataSchema,
  gynecologyExamDataSchema,
  ophthalmologyExamDataSchema,
  psychiatryExamDataSchema,
  type CardiologyExamData,
  type ClinicalInvestigation,
  type DermatologyExamData,
  type GrowthChartData,
  type GynecologyExamData,
  type OphthalmologyExamData,
  type PsychiatryExamData,
} from "@workspace/types";
import {
  mapSessionChiefComplaints,
  mapSessionDiagnosis,
  mapSessionExamination,
  parseStructuredChiefComplaints,
} from "./consultation-session-mappers";
import { parseChiefComplaintsFromAppointmentData } from "@workspace/utils";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/ChiefComplaintInput";
import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import type { DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";
import { DEFAULT_EXAMINATION } from "./consultationDraftHelpers";

export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value));
}

export function readStringField(
  data: Record<string, unknown>,
  key: string,
): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function parseZodField<T>(schema: z.ZodType<T>, raw: unknown, fallback: T): T {
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}

const DEFAULT_GROWTH_DATA: GrowthChartData = {
  patientGender: "MALE",
  measurements: [],
};

export const consultationDraftSessionSchema = z.object({
  savedAt: z.number().optional(),
  chiefComplaint: z.array(chiefComplaintDraftItemSchema).optional(),
  history: z.string().optional(),
  examination: examinationDraftSchema.optional(),
  diagnosis: z.array(diagnosisDraftItemSchema).optional(),
  treatment: z.string().optional(),
  followUpPlan: z.string().optional(),
  dentalChart: dentalChartSchema.optional(),
  eyeExam: ophthalmologyExamDataSchema.optional(),
  growthData: growthChartDataSchema.optional(),
  cardiologyExam: cardiologyExamDataSchema.optional(),
  dermatologyExam: dermatologyExamDataSchema.optional(),
  gynecologyExam: gynecologyExamDataSchema.optional(),
  psychiatryExam: psychiatryExamDataSchema.optional(),
  investigations: z.array(clinicalInvestigationSchema).optional(),
});

export interface ConsultationHydrateSeed {
  chiefComplaint: ChiefComplaintItem[];
  examination: ExaminationData;
  diagnosis: DiagnosisItem[];
  treatment: string;
  history: string;
  followUpPlan: string;
  dentalChart: DentalChartValue;
  eyeExam: OphthalmologyExamData;
  growthData: GrowthChartData;
  cardiologyExam: CardiologyExamData;
  dermatologyExam: DermatologyExamData;
  gynecologyExam: GynecologyExamData;
  psychiatryExam: PsychiatryExamData;
  investigations: ClinicalInvestigation[];
  serverUpdatedAtMs: number;
}

export type ConsultationDraftSession = z.infer<
  typeof consultationDraftSessionSchema
>;

export function applyConsultationSessionDraft<
  TState extends {
    chiefComplaint: ChiefComplaintItem[];
    history: string;
    examination: ExaminationData;
    diagnosis: DiagnosisItem[];
    treatment: string;
    followUpPlan: string;
    dentalChart: DentalChartValue;
    eyeExam: OphthalmologyExamData;
    growthData: GrowthChartData;
    cardiologyExam: CardiologyExamData;
    dermatologyExam: DermatologyExamData;
    gynecologyExam: GynecologyExamData;
    psychiatryExam: PsychiatryExamData;
    investigations: ClinicalInvestigation[];
  },
>(state: TState, session: ConsultationDraftSession): TState {
  return {
    ...state,
    chiefComplaint: session.chiefComplaint
      ? mapSessionChiefComplaints(session.chiefComplaint)
      : state.chiefComplaint,
    history: session.history ?? state.history,
    examination: session.examination
      ? mapSessionExamination(session.examination)
      : state.examination,
    diagnosis: session.diagnosis
      ? mapSessionDiagnosis(session.diagnosis)
      : state.diagnosis,
    treatment: session.treatment ?? state.treatment,
    followUpPlan: session.followUpPlan ?? state.followUpPlan,
    dentalChart: session.dentalChart ?? state.dentalChart,
    eyeExam: session.eyeExam ?? state.eyeExam,
    growthData: session.growthData ?? state.growthData,
    cardiologyExam: session.cardiologyExam ?? state.cardiologyExam,
    dermatologyExam: session.dermatologyExam ?? state.dermatologyExam,
    gynecologyExam: session.gynecologyExam ?? state.gynecologyExam,
    psychiatryExam: session.psychiatryExam ?? state.psychiatryExam,
    investigations: session.investigations ?? state.investigations,
    dirty: true,
    saveState: "dirty",
  };
}

export function buildConsultationHydrateSeed(
  data: Record<string, unknown>,
): ConsultationHydrateSeed {
  const updatedAtRaw = data["updatedAt"];
  const serverUpdatedAtMs =
    typeof updatedAtRaw === "string"
      ? new Date(updatedAtRaw).getTime()
      : updatedAtRaw instanceof Date
        ? updatedAtRaw.getTime()
        : 0;

  return {
    chiefComplaint: buildChiefComplaintSeed(data),
    examination: buildExaminationSeed(data),
    diagnosis: parseDiagnosis(data["finalDiagnosis"]),
    treatment: readStringField(data, "treatmentPlan"),
    history: readStringField(data, "historyOfPresentIllness"),
    followUpPlan: readStringField(data, "followUpPlan"),
    dentalChart: parseZodField(dentalChartSchema, data["dentalChart"], {}),
    eyeExam: parseZodField(
      ophthalmologyExamDataSchema,
      data["ophthalmologyExam"],
      {},
    ),
    growthData: parseZodField(
      growthChartDataSchema,
      data["growthData"],
      DEFAULT_GROWTH_DATA,
    ),
    cardiologyExam: parseZodField(
      cardiologyExamDataSchema,
      data["cardiologyExam"],
      {},
    ),
    dermatologyExam: parseZodField(
      dermatologyExamDataSchema,
      data["dermatologyExam"],
      {},
    ),
    gynecologyExam: parseZodField(
      gynecologyExamDataSchema,
      data["gynecologyExam"],
      {},
    ),
    psychiatryExam: parseZodField(
      psychiatryExamDataSchema,
      data["psychiatryExam"],
      {},
    ),
    investigations: parseZodField(
      z.array(clinicalInvestigationSchema),
      data["investigations"],
      [],
    ),
    serverUpdatedAtMs,
  };
}

function nestedSystemicNotes(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = toRecord(raw);
    if (typeof obj.notes === "string") return obj.notes;
  }
  return "";
}

function readRecordString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
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

function isDiagnosisItem(value: unknown): value is DiagnosisItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = toRecord(value);
  return (
    typeof row.condition === "string" || typeof row.id === "string"
  );
}

function parseDiagnosisArray(values: unknown[]): DiagnosisItem[] {
  return values.filter(isDiagnosisItem);
}

export function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseDiagnosisArray(raw);
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseDiagnosisArray(parsed);
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
      item.complaint?.trim() &&
      (!item.durationValue || !item.durationValue.trim())
        ? "1"
        : item.durationValue,
  }));
}

export function buildChiefComplaintSeed(
  data: Record<string, unknown>,
): ChiefComplaintItem[] {
  const structured = parseStructuredChiefComplaints(
    data["chiefComplaintStructured"],
  );
  const jsonRows = parseChiefComplaintsFromAppointmentData(data);

  if (structured?.length) {
    return normalizeComplaintList(structured);
  }

  if (jsonRows.length > 0) {
    return normalizeComplaintList(
      jsonRows.map((row) => ({
        id: row.id ?? crypto.randomUUID(),
        complaint: row.complaint ?? "",
        durationValue: row.durationValue?.trim() ? row.durationValue : "1",
        durationUnit: row.durationUnit ?? "days",
        severity: row.severity || "moderate",
        notes: row.notes,
      })),
    );
  }

  const rawComplaint = readStringField(data, "chiefComplaint").trim();
  return rawComplaint
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

export function buildExaminationSeed(
  data: Record<string, unknown>,
): ExaminationData {
  const genExam = data["generalExamination"];
  const sysExam = data["systemicExamination"];
  const sysRecord = sysExam ? toRecord(sysExam) : {};
  const mssRaw = sysRecord["mss"];
  let musculoskeletalFromMss = "";
  if (mssRaw && typeof mssRaw === "object") {
    const mss = toRecord(mssRaw);
    musculoskeletalFromMss = [
      readRecordString(mss, "jointExamination"),
      readRecordString(mss, "notes"),
      readRecordString(mss, "muscleStrength"),
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const genRecord =
    genExam && typeof genExam === "object" ? toRecord(genExam) : {};
  const generalNotesFromApi =
    typeof genRecord["generalNotes"] === "string"
      ? genRecord["generalNotes"]
      : "";
  const generalNotesUi =
    typeof genRecord["notes"] === "string" ? genRecord["notes"] : "";
  const parsedGeneral = {
    ...DEFAULT_EXAMINATION.general,
    ...parseZodField(
      examinationDraftSchema.shape.general,
      genExam,
      DEFAULT_EXAMINATION.general,
    ),
  };

  return {
    general: genExam
      ? {
          pallor: parsedGeneral.pallor === true,
          icterus: parsedGeneral.icterus === true,
          cyanosis: parsedGeneral.cyanosis === true,
          clubbing: parsedGeneral.clubbing === true,
          lymphadenopathy: parsedGeneral.lymphadenopathy === true,
          edema: parsedGeneral.edema === true,
          notes:
            generalNotesUi || generalNotesFromApi || parsedGeneral.notes || "",
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
}
