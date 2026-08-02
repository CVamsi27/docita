import type { ChiefComplaintItem } from "@/features/consultation/components/structured/chief-complaint.types";
import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";
import type { ExaminationData } from "@/features/consultation/components/structured/examination-input.types";
import type { Medication } from "@/features/consultation/components/structured/prescription-input.types";
import type { DentalChartValue } from "@/features/consultation/components/specialty/dental-chart.types";
import type {
  CardiologyExamData,
  ClinicalInvestigation,
  DermatologyExamData,
  GrowthChartData,
  GynecologyExamData,
  OphthalmologyExamData,
  PsychiatryExamData,
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
