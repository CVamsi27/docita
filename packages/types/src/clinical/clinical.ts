import { z } from "zod";
import { optionalStringStripHtml } from "../api/zod-helpers";
import { vitalSignSchema } from "./vitals";
export const generalExaminationSchema = z.object({
  gcs: z.number().min(3).max(15).optional(),
  consciousness: z.enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"]).optional(),
  orientation: z.enum(["ORIENTED", "DISORIENTED", "CONFUSED"]).optional(),

  pallor: z.boolean().optional(),
  icterus: z.boolean().optional(),
  cyanosis: z.boolean().optional(),
  clubbing: z.boolean().optional(),
  lymphadenopathy: z.boolean().optional(),
  edema: z.boolean().optional(),

  pallorNotes: optionalStringStripHtml(500),
  icterusNotes: optionalStringStripHtml(500),
  cyanosisNotes: optionalStringStripHtml(500),
  clubbingNotes: optionalStringStripHtml(500),
  lymphadenopathyNotes: optionalStringStripHtml(500),
  edemaLocation: optionalStringStripHtml(255),

  nutritionStatus: z
    .enum(["WELL_NOURISHED", "MALNOURISHED", "OBESE", "UNDERWEIGHT"])
    .optional(),
  hydrationStatus: z
    .enum(["WELL_HYDRATED", "DEHYDRATED", "OVERHYDRATED"])
    .optional(),

  generalNotes: optionalStringStripHtml(2000),
});
export type GeneralExamination = z.infer<typeof generalExaminationSchema>;

export const systemicExaminationSchema = z.object({
  cvs: z
    .object({
      heartRate: z.number().optional(),
      rhythm: z
        .enum(["REGULAR", "IRREGULAR", "IRREGULARLY_IRREGULAR"])
        .optional(),
      heartSounds: optionalStringStripHtml(500),
      jvp: optionalStringStripHtml(100),
      peripheralPulses: optionalStringStripHtml(200),
      notes: optionalStringStripHtml(1000),
    })
    .optional(),

  rs: z
    .object({
      respiratoryRate: z.number().optional(),
      breathSounds: optionalStringStripHtml(500),
      additionalSounds: optionalStringStripHtml(500),
      chestMovement: z.enum(["NORMAL", "REDUCED", "ASYMMETRIC"]).optional(),
      percussion: optionalStringStripHtml(200),
      notes: optionalStringStripHtml(1000),
    })
    .optional(),

  pa: z
    .object({
      shape: z.enum(["FLAT", "DISTENDED", "SCAPHOID", "NORMAL"]).optional(),
      tenderness: z.boolean().optional(),
      tendernessLocation: optionalStringStripHtml(255),
      organomegaly: optionalStringStripHtml(255),
      bowelSounds: z
        .enum(["NORMAL", "HYPERACTIVE", "HYPOACTIVE", "ABSENT"])
        .optional(),
      ascites: z.boolean().optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),

  cns: z
    .object({
      consciousness: z
        .enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"])
        .optional(),
      cranialNerves: optionalStringStripHtml(1000),
      motorFunction: optionalStringStripHtml(1000),
      sensoryFunction: optionalStringStripHtml(1000),
      reflexes: optionalStringStripHtml(500),
      coordination: optionalStringStripHtml(500),
      notes: optionalStringStripHtml(1000),
    })
    .optional(),

  mss: z
    .object({
      gait: z
        .enum(["NORMAL", "ANTALGIC", "ATAXIC", "SPASTIC", "OTHER"])
        .optional(),
      jointExamination: optionalStringStripHtml(1000),
      muscleStrength: optionalStringStripHtml(500),
      deformities: optionalStringStripHtml(500),
      notes: optionalStringStripHtml(1000),
    })
    .optional(),

  skin: z
    .object({
      color: optionalStringStripHtml(100),
      texture: optionalStringStripHtml(100),
      lesions: optionalStringStripHtml(1000),
      rashes: optionalStringStripHtml(1000),
      notes: optionalStringStripHtml(1000),
    })
    .optional(),

  localExamination: optionalStringStripHtml(2000),

  additionalNotes: z.string().max(2000).optional(),
});
export type SystemicExamination = z.infer<typeof systemicExaminationSchema>;

export const clinicalInvestigationSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(255),
  category: z.enum(["LABORATORY", "IMAGING", "SPECIAL", "OTHER"]).optional(),
  status: z.enum(["ORDERED", "PENDING", "COMPLETED", "CANCELLED"]).optional(),
  result: z.string().max(2000).optional(),
  normalRange: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  orderedAt: z.string().or(z.date()).optional(),
  completedAt: z.string().or(z.date()).optional(),
  // Optional report/scan attached on the spot during the consultation.
  // `attachmentUrl` is the stored file URL; `attachmentDocumentId` links the
  // medical-document record created alongside it.
  attachmentUrl: z.string().max(2048).optional(),
  attachmentName: z.string().max(255).optional(),
  attachmentDocumentId: z.string().optional(),
});
export type ClinicalInvestigation = z.infer<typeof clinicalInvestigationSchema>;

export const toothConditionSchema = z.enum([
  "HEALTHY",
  "CARIES",
  "FILLED",
  "MISSING",
  "CROWN",
  "ROOT_CANAL",
  "IMPLANT",
  "BRIDGE",
  "EXTRACTED",
  "IMPACTED",
]);
export type ToothCondition = z.infer<typeof toothConditionSchema>;

export const toothSurfaceSchema = z.enum(["M", "O", "D", "L", "B", "ALL"]);
export type ToothSurface = z.infer<typeof toothSurfaceSchema>;

export const toothEntrySchema = z.object({
  toothNumber: z.number(),
  condition: toothConditionSchema,
  surface: toothSurfaceSchema.optional(),
  notes: z.string().optional(),
  proposedTreatment: z.string().optional(),
});
export type ToothEntry = z.infer<typeof toothEntrySchema>;

export const dentalChartSchema = z.record(
  z.object({
    condition: z.string(),
    notes: z.string(),
  }),
);
export type DentalChartData = z.infer<typeof dentalChartSchema>;

export const growthMeasurementSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  ageMonths: z.number(),
  weight: z.number().optional(),
  height: z.number().optional(),
  headCircumference: z.number().optional(),
  bmi: z.number().optional(),
  notes: z.string().optional(),
});
export type GrowthMeasurement = z.infer<typeof growthMeasurementSchema>;

export const growthChartDataSchema = z.object({
  patientGender: z.enum(["MALE", "FEMALE"]),
  measurements: z.array(growthMeasurementSchema),
  generalNotes: z.string().optional(),
});
export type GrowthChartData = z.infer<typeof growthChartDataSchema>;

export const refractionEyeDataSchema = z.object({
  sphere: z.number().optional(),
  cylinder: z.number().optional(),
  axis: z.number().min(0).max(180).optional(),
  add: z.number().optional(),
  prism: z.string().optional(),
});
export type RefractionEyeData = z.infer<typeof refractionEyeDataSchema>;

export const refractionDataSchema = z.object({
  od: refractionEyeDataSchema.optional(),
  os: refractionEyeDataSchema.optional(),
  pupillaryDistance: z.number().optional(),
  notes: z.string().optional(),
});
export type RefractionData = z.infer<typeof refractionDataSchema>;

export const visualAcuityEyeDataSchema = z.object({
  uncorrected: z.string().optional(),
  corrected: z.string().optional(),
  pinhole: z.string().optional(),
});
export type VisualAcuityEyeData = z.infer<typeof visualAcuityEyeDataSchema>;

export const visualAcuityBothEyesDataSchema = z.object({
  uncorrected: z.string().optional(),
  corrected: z.string().optional(),
});

export const visualAcuityDataSchema = z.object({
  od: visualAcuityEyeDataSchema.optional(),
  os: visualAcuityEyeDataSchema.optional(),
  ou: visualAcuityBothEyesDataSchema.optional(),
  notes: z.string().optional(),
});
export type VisualAcuityData = z.infer<typeof visualAcuityDataSchema>;

export const iopDataSchema = z.object({
  od: z.number().optional(),
  os: z.number().optional(),
  method: z.enum(["NCT", "Applanation", "iCare", "Other"]).optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
});
export type IOPData = z.infer<typeof iopDataSchema>;

export const ophthalmologyExamDataSchema = z.object({
  visualAcuity: visualAcuityDataSchema.optional(),
  refraction: refractionDataSchema.optional(),
  iop: iopDataSchema.optional(),
  anteriorSegment: z
    .object({
      od: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  posteriorSegment: z
    .object({
      od: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  diagnosis: z.string().optional(),
  plan: z.string().optional(),
  generalNotes: z.string().optional(),
});
export type OphthalmologyExamData = z.infer<typeof ophthalmologyExamDataSchema>;

export const ecgDataSchema = z.object({
  heartRate: z.number().optional(),
  rhythm: z
    .enum([
      "Sinus",
      "Atrial Fibrillation",
      "Atrial Flutter",
      "SVT",
      "Ventricular Tachycardia",
      "Other",
    ])
    .optional(),
  prInterval: z.number().optional(),
  qrsDuration: z.number().optional(),
  qtInterval: z.number().optional(),
  qtcInterval: z.number().optional(),
  axis: z
    .enum([
      "Normal",
      "Left Axis Deviation",
      "Right Axis Deviation",
      "Extreme Axis Deviation",
      "Other",
    ])
    .optional(),
  interpretation: z.string().optional(),
  findings: z.string().optional(),
  imageUrl: z.string().optional(),
  performedAt: z.string().optional(),
});
export type ECGData = z.infer<typeof ecgDataSchema>;

export const echoDataSchema = z.object({
  lvef: z.number().optional(),
  lviddDiastole: z.number().optional(),
  lvisdSystole: z.number().optional(),
  septumThickness: z.number().optional(),
  posteriorWallThickness: z.number().optional(),
  lvMass: z.number().optional(),
  mitralValve: z.string().optional(),
  aorticValve: z.string().optional(),
  tricuspidValve: z.string().optional(),
  pulmonicValve: z.string().optional(),
  leftAtriumSize: z.number().optional(),
  aorticRoot: z.number().optional(),
  rightVentricle: z.string().optional(),
  pericardium: z.string().optional(),
  dopplerFindings: z.string().optional(),
  interpretation: z.string().optional(),
  imageUrl: z.string().optional(),
  performedAt: z.string().optional(),
});
export type EchoData = z.infer<typeof echoDataSchema>;

export const stressTestDataSchema = z.object({
  testType: z
    .enum(["Treadmill", "Pharmacological", "Stress Echo", "Nuclear"])
    .optional(),
  protocol: z.string().optional(),
  maxHeartRate: z.number().optional(),
  targetHeartRate: z.number().optional(),
  duration: z.number().optional(),
  mets: z.number().optional(),
  stSegmentChanges: z.boolean().optional(),
  symptoms: z.string().optional(),
  bloodPressureResponse: z.string().optional(),
  conclusion: z.string().optional(),
  performedAt: z.string().optional(),
});
export type StressTestData = z.infer<typeof stressTestDataSchema>;

export const cardiologyExamDataSchema = z.object({
  ecg: ecgDataSchema.optional(),
  echo: echoDataSchema.optional(),
  stressTest: stressTestDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  riskFactors: z.string().optional(),
  medications: z.string().optional(),
  plan: z.string().optional(),
  generalNotes: z.string().optional(),
});
export type CardiologyExamData = z.infer<typeof cardiologyExamDataSchema>;

export const menstrualHistoryDataSchema = z.object({
  lmp: z.string().optional(),
  cycleLength: z.number().optional(),
  cycleDuration: z.number().optional(),
  regularity: z.enum(["regular", "irregular"]).optional(),
  flow: z.enum(["scanty", "normal", "heavy"]).optional(),
  dysmenorrhea: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  notes: z.string().optional(),
});
export type MenstrualHistoryData = z.infer<typeof menstrualHistoryDataSchema>;

export const obstetricHistoryDataSchema = z.object({
  gravida: z.number().optional(),
  term: z.number().optional(),
  preterm: z.number().optional(),
  abortions: z.number().optional(),
  living: z.number().optional(),
  edd: z.string().optional(),
  gestationalAge: z.string().optional(),
  previousPregnancyNotes: z.string().optional(),
});
export type ObstetricHistoryData = z.infer<typeof obstetricHistoryDataSchema>;

export const antenatalRecordDataSchema = z.object({
  fundalHeight: z.number().optional(),
  fetalHeartRate: z.number().optional(),
  presentation: z
    .enum(["cephalic", "breech", "transverse", "oblique"])
    .optional(),
  engagement: z
    .enum(["not-engaged", "1/5", "2/5", "3/5", "4/5", "5/5"])
    .optional(),
  liquorVolume: z
    .enum(["normal", "oligohydramnios", "polyhydramnios"])
    .optional(),
  placentalLocation: z.string().optional(),
  movements: z.enum(["normal", "reduced", "excessive"]).optional(),
  cervicalDilation: z.number().optional(),
  cervicalEffacement: z.number().optional(),
  notes: z.string().optional(),
});
export type AntenatalRecordData = z.infer<typeof antenatalRecordDataSchema>;

export const gynecologyExamDataSchema = z.object({
  menstrualHistory: menstrualHistoryDataSchema.optional(),
  obstetricHistory: obstetricHistoryDataSchema.optional(),
  antenatalRecord: antenatalRecordDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type GynecologyExamData = z.infer<typeof gynecologyExamDataSchema>;

export const skinAssessmentDataSchema = z.object({
  fitzpatrickType: z.enum(["I", "II", "III", "IV", "V", "VI"]).optional(),
  skinType: z
    .enum(["normal", "dry", "oily", "combination", "sensitive"])
    .optional(),
  generalCondition: z.string().optional(),
  notes: z.string().optional(),
});
export type SkinAssessmentData = z.infer<typeof skinAssessmentDataSchema>;

export const lesionDataSchema = z.object({
  id: z.string(),
  location: z.string(),
  bodyRegion: z.string().optional(),
  size: z.number().optional(),
  shape: z.enum(["round", "oval", "irregular", "linear", "annular"]).optional(),
  color: z.string().optional(),
  border: z
    .enum(["well-defined", "ill-defined", "irregular", "raised"])
    .optional(),
  surface: z
    .enum(["smooth", "rough", "scaly", "crusted", "ulcerated", "vesicular"])
    .optional(),
  elevation: z.enum(["flat", "raised", "depressed"]).optional(),
  consistency: z.enum(["soft", "firm", "hard", "fluctuant"]).optional(),
  tenderness: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  description: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  followUp: z.string().optional(),
});
export type LesionData = z.infer<typeof lesionDataSchema>;

export const dermatologyExamDataSchema = z.object({
  skinAssessment: skinAssessmentDataSchema.optional(),
  lesions: z.array(lesionDataSchema).optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type DermatologyExamData = z.infer<typeof dermatologyExamDataSchema>;

export const mseDataSchema = z.object({
  appearance: z.string().optional(),
  behavior: z.string().optional(),
  eyeContact: z.string().optional(),
  psychomotorActivity: z.string().optional(),

  speech: z.string().optional(),
  speechRate: z.enum(["normal", "slow", "rapid", "pressured"]).optional(),
  speechVolume: z.enum(["normal", "soft", "loud"]).optional(),

  mood: z.string().optional(),
  affect: z.string().optional(),
  affectType: z
    .enum(["full", "restricted", "blunted", "flat", "labile"])
    .optional(),
  affectCongruence: z.enum(["congruent", "incongruent"]).optional(),

  thoughtProcess: z.string().optional(),
  thoughtProcessType: z
    .enum([
      "linear",
      "circumstantial",
      "tangential",
      "loose",
      "flight-of-ideas",
      "perseveration",
    ])
    .optional(),
  thoughtContent: z.string().optional(),
  delusions: z.boolean().optional(),
  delusionType: z.string().optional(),
  obsessions: z.boolean().optional(),
  compulsions: z.boolean().optional(),
  suicidalIdeation: z.boolean().optional(),
  homicidalIdeation: z.boolean().optional(),

  hallucinations: z.boolean().optional(),
  hallucinationType: z.string().optional(),
  hallucinationDescription: z.string().optional(),
  illusions: z.boolean().optional(),
  depersonalization: z.boolean().optional(),
  derealization: z.boolean().optional(),

  consciousness: z
    .enum(["alert", "drowsy", "obtunded", "stuporous", "comatose"])
    .optional(),
  orientation: z.string().optional(),
  orientedTo: z.array(z.string()).optional(),
  attention: z.string().optional(),
  concentration: z.string().optional(),
  memory: z.string().optional(),
  memoryImmediate: z.string().optional(),
  memoryRecent: z.string().optional(),
  memoryRemote: z.string().optional(),

  insight: z.enum(["good", "fair", "poor", "absent"]).optional(),
  insightDescription: z.string().optional(),
  judgment: z.enum(["good", "fair", "poor", "impaired"]).optional(),
  judgmentDescription: z.string().optional(),

  notes: z.string().optional(),
});

export const riskAssessmentDataSchema = z.object({
  suicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  suicidalThoughts: z.boolean().optional(),
  suicidalPlan: z.boolean().optional(),
  suicidalIntent: z.boolean().optional(),
  suicidalMeans: z.boolean().optional(),
  previousAttempts: z.boolean().optional(),
  previousAttemptsDetails: z.string().optional(),
  protectiveFactors: z.string().optional(),

  homicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  homicidalThoughts: z.boolean().optional(),
  homicidalPlan: z.boolean().optional(),
  homicidalIntent: z.boolean().optional(),
  homicidalMeans: z.boolean().optional(),
  identifiedTarget: z.boolean().optional(),
  targetDetails: z.string().optional(),

  riskManagement: z.string().optional(),
  safetyPlan: z.string().optional(),
});

export const screeningScalesDataSchema = z.object({
  phq9Score: z.number().min(0).max(27).optional(),
  phq9Severity: z
    .enum(["minimal", "mild", "moderate", "moderately-severe", "severe"])
    .optional(),

  gad7Score: z.number().min(0).max(21).optional(),
  gad7Severity: z.enum(["minimal", "mild", "moderate", "severe"]).optional(),

  ymrsScore: z.number().min(0).max(60).optional(),

  otherScales: z.string().optional(),
});

export const psychiatryExamDataSchema = z.object({
  mse: mseDataSchema.optional(),
  riskAssessment: riskAssessmentDataSchema.optional(),
  screeningScales: screeningScalesDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});

export type MSEData = z.infer<typeof mseDataSchema>;
export type RiskAssessmentData = z.infer<typeof riskAssessmentDataSchema>;
export type ScreeningScalesData = z.infer<typeof screeningScalesDataSchema>;
export type PsychiatryExamData = z.infer<typeof psychiatryExamDataSchema>;

export const clinicalNoteSchema = z.object({
  chiefComplaint: optionalStringStripHtml(20000),
  treatmentHistory: optionalStringStripHtml(5000),
  historyOfPresentIllness: optionalStringStripHtml(5000),
  pastMedicalHistory: optionalStringStripHtml(5000),
  familyHistory: optionalStringStripHtml(2000),
  socialHistory: optionalStringStripHtml(2000),
  reviewOfSystems: optionalStringStripHtml(5000),
  allergies: optionalStringStripHtml(2000),
  currentMedications: optionalStringStripHtml(5000),

  vitalSigns: vitalSignSchema.optional(),
  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),

  dentalChart: dentalChartSchema.optional(),
  growthData: growthChartDataSchema.optional(),
  ophthalmologyExam: ophthalmologyExamDataSchema.optional(),
  cardiologyExam: cardiologyExamDataSchema.optional(),
  gynecologyExam: gynecologyExamDataSchema.optional(),
  dermatologyExam: dermatologyExamDataSchema.optional(),
  psychiatryExam: psychiatryExamDataSchema.optional(),

  provisionalDiagnosis: optionalStringStripHtml(1000),
  differentialDiagnosis: optionalStringStripHtml(2000),
  clinicalImpression: optionalStringStripHtml(2000),

  investigations: z.array(clinicalInvestigationSchema).optional(),
  finalDiagnosis: optionalStringStripHtml(1000),
  treatmentPlan: optionalStringStripHtml(5000),
  prescriptions: z
    .array(
      z.object({
        name: z.string().max(255),
        dosage: z.string().max(100),
        frequency: z.string().max(100),
        duration: z.string().max(100),
        route: z.string().max(50).default("PO"),
      }),
    )
    .optional(),
  followUpPlan: optionalStringStripHtml(2000),
  patientEducation: optionalStringStripHtml(5000),
});
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

/** Prisma `ClinicalTemplate.fields` — form field definitions per speciality. */
export const clinicalTemplateFieldsSchema = z.array(z.record(z.unknown()));

/** Prisma `LabTestOrder.result` — structured lab result key/value map. */
export const labTestOrderResultJsonSchema = z.record(z.unknown());

export const clinicalTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  speciality: z.string(),
  defaultObservations: z.string(),
  fields: clinicalTemplateFieldsSchema.default([]),
  userId: z.string().optional(),
  clinicId: z.string().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type ClinicalTemplate = z.infer<typeof clinicalTemplateSchema>;
