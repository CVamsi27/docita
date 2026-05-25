import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import type {
  ConsultationDraftState,
  SaveState,
} from "@/features/consultation/state/useConsultationDraft";
import type {
  CardiologyExamData,
  DermatologyExamData,
  GrowthChartData,
  GynecologyExamData,
  PsychiatryExamData,
} from "@workspace/types";

export type { SaveState };

export const DEFAULT_EXAMINATION: ExaminationData = {
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

const DEFAULT_CARDIOLOGY: CardiologyExamData = {};

const DEFAULT_DERMATOLOGY: DermatologyExamData = {};

const DEFAULT_GYNECOLOGY: GynecologyExamData = {};

const DEFAULT_PSYCHIATRY: PsychiatryExamData = {};

export const DEFAULT_CONSULTATION_DRAFT_STATE: ConsultationDraftState = {
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
  cardiologyExam: DEFAULT_CARDIOLOGY,
  dermatologyExam: DEFAULT_DERMATOLOGY,
  gynecologyExam: DEFAULT_GYNECOLOGY,
  psychiatryExam: DEFAULT_PSYCHIATRY,
  investigations: [],
  followUpPlan: "",
  dirty: false,
  saveState: "idle",
  lastSavedAt: null,
  lastError: null,
  diagnosesContentHash: null,
};

import { applyDraftUpdater } from "@/features/consultation/state/consultation-draft-updater.boundary";

export function resolveDraftUpdater<T>(
  updater: ((prev: T) => T) | T,
  prev: T,
): T {
  return applyDraftUpdater(updater, prev);
}

export async function hashDiagnosesForSync(
  items: Array<{
    icdCodeId?: string;
    notes?: string;
    isPrimary?: boolean;
  }>,
): Promise<string> {
  const normalized = items
    .filter((d) => d.icdCodeId)
    .map((d) => ({
      icdCodeId: d.icdCodeId,
      notes: (d.notes ?? "").trim(),
      isPrimary: Boolean(d.isPrimary),
    }))
    .sort((a, b) => (a.icdCodeId! > b.icdCodeId! ? 1 : -1));

  const json = JSON.stringify(normalized);
  const encoded = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32);
}

export function draftSessionStorageKey(appointmentId: string): string {
  return `docita:consultation-draft:${appointmentId}`;
}
