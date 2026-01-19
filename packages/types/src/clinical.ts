import { z } from "zod";
import { vitalSignSchema } from "./vitals";
export const generalExaminationSchema = z.object({
  // Consciousness
  gcs: z.number().min(3).max(15).optional(), // Glasgow Coma Scale
  consciousness: z.enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"]).optional(),
  orientation: z.enum(["ORIENTED", "DISORIENTED", "CONFUSED"]).optional(),

  // General Signs
  pallor: z.boolean().optional(),
  icterus: z.boolean().optional(), // Jaundice
  cyanosis: z.boolean().optional(),
  clubbing: z.boolean().optional(),
  lymphadenopathy: z.boolean().optional(),
  edema: z.boolean().optional(),

  // Notes for each
  pallorNotes: z.string().optional(),
  icterusNotes: z.string().optional(),
  cyanosisNotes: z.string().optional(),
  clubbingNotes: z.string().optional(),
  lymphadenopathyNotes: z.string().optional(),
  edemaLocation: z.string().optional(), // e.g., "bilateral pedal edema"

  // Nutritional Status
  nutritionStatus: z
    .enum(["WELL_NOURISHED", "MALNOURISHED", "OBESE", "UNDERWEIGHT"])
    .optional(),
  hydrationStatus: z
    .enum(["WELL_HYDRATED", "DEHYDRATED", "OVERHYDRATED"])
    .optional(),

  // Additional notes
  generalNotes: z.string().optional(),
});
export type GeneralExamination = z.infer<typeof generalExaminationSchema>;

// Systemic Examination findings
export const systemicExaminationSchema = z.object({
  // Cardiovascular System (CVS)
  cvs: z
    .object({
      heartRate: z.number().optional(),
      rhythm: z
        .enum(["REGULAR", "IRREGULAR", "IRREGULARLY_IRREGULAR"])
        .optional(),
      heartSounds: z.string().optional(), // e.g., "S1 S2 heard, no murmurs"
      jvp: z.string().optional(), // Jugular Venous Pressure
      peripheralPulses: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Respiratory System (RS)
  rs: z
    .object({
      respiratoryRate: z.number().optional(),
      breathSounds: z.string().optional(), // e.g., "Bilateral vesicular breath sounds"
      additionalSounds: z.string().optional(), // Crackles, wheezes, rhonchi
      chestMovement: z.enum(["NORMAL", "REDUCED", "ASYMMETRIC"]).optional(),
      percussion: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Per Abdomen (P/A)
  pa: z
    .object({
      shape: z.enum(["FLAT", "DISTENDED", "SCAPHOID", "NORMAL"]).optional(),
      tenderness: z.boolean().optional(),
      tendernessLocation: z.string().optional(),
      organomegaly: z.string().optional(), // Hepatomegaly, splenomegaly
      bowelSounds: z
        .enum(["NORMAL", "HYPERACTIVE", "HYPOACTIVE", "ABSENT"])
        .optional(),
      ascites: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Central Nervous System (CNS)
  cns: z
    .object({
      consciousness: z
        .enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"])
        .optional(),
      cranialNerves: z.string().optional(),
      motorFunction: z.string().optional(),
      sensoryFunction: z.string().optional(),
      reflexes: z.string().optional(),
      coordination: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Musculoskeletal System (MSS)
  mss: z
    .object({
      gait: z
        .enum(["NORMAL", "ANTALGIC", "ATAXIC", "SPASTIC", "OTHER"])
        .optional(),
      jointExamination: z.string().optional(),
      muscleStrength: z.string().optional(),
      deformities: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Skin / Integumentary
  skin: z
    .object({
      color: z.string().optional(),
      texture: z.string().optional(),
      lesions: z.string().optional(),
      rashes: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Local Examination (for specific complaints)
  localExamination: z.string().optional(),

  // Additional systemic examination notes
  additionalNotes: z.string().optional(),
});
export type SystemicExamination = z.infer<typeof systemicExaminationSchema>;

// Clinical Investigations ordered
export const clinicalInvestigationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: z.enum(["LABORATORY", "IMAGING", "SPECIAL", "OTHER"]).optional(),
  status: z.enum(["ORDERED", "PENDING", "COMPLETED", "CANCELLED"]).optional(),
  result: z.string().optional(),
  normalRange: z.string().optional(),
  notes: z.string().optional(),
  orderedAt: z.string().or(z.date()).optional(),
  completedAt: z.string().or(z.date()).optional(),
});
export type ClinicalInvestigation = z.infer<typeof clinicalInvestigationSchema>;

// ============================================================================
// Dental Chart Schema
// ============================================================================

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

export const dentalChartSchema = z.object({
  dentitionType: z.enum(["ADULT", "PRIMARY", "MIXED"]),
  numberingSystem: z.enum(["FDI", "UNIVERSAL"]),
  teeth: z.array(toothEntrySchema),
  generalNotes: z.string().optional(),
});
export type DentalChartData = z.infer<typeof dentalChartSchema>;

// ============================================================================
// Growth Chart Schemas (for Pediatric)
// ============================================================================

export const growthMeasurementSchema = z.object({
  id: z.string().optional(),
  date: z.string(), // ISO date string
  ageMonths: z.number(), // Age in months at measurement
  weight: z.number().optional(), // kg
  height: z.number().optional(), // cm
  headCircumference: z.number().optional(), // cm (for 0-36 months)
  bmi: z.number().optional(), // Calculated
  notes: z.string().optional(),
});
export type GrowthMeasurement = z.infer<typeof growthMeasurementSchema>;

export const growthChartDataSchema = z.object({
  patientGender: z.enum(["MALE", "FEMALE"]),
  measurements: z.array(growthMeasurementSchema),
  generalNotes: z.string().optional(),
});
export type GrowthChartData = z.infer<typeof growthChartDataSchema>;

// ============================================================================
// Ophthalmology Exam Schemas
// ============================================================================

export const refractionEyeDataSchema = z.object({
  sphere: z.number().optional(), // Diopters
  cylinder: z.number().optional(), // Diopters
  axis: z.number().min(0).max(180).optional(), // Degrees
  add: z.number().optional(), // Addition for near vision
  prism: z.string().optional(), // Prism correction
});
export type RefractionEyeData = z.infer<typeof refractionEyeDataSchema>;

export const refractionDataSchema = z.object({
  od: refractionEyeDataSchema.optional(), // Oculus Dexter (Right Eye)
  os: refractionEyeDataSchema.optional(), // Oculus Sinister (Left Eye)
  pupillaryDistance: z.number().optional(), // PD in mm
  notes: z.string().optional(),
});
export type RefractionData = z.infer<typeof refractionDataSchema>;

export const visualAcuityEyeDataSchema = z.object({
  uncorrected: z.string().optional(), // e.g., "20/40"
  corrected: z.string().optional(), // e.g., "20/20"
  pinhole: z.string().optional(),
});
export type VisualAcuityEyeData = z.infer<typeof visualAcuityEyeDataSchema>;

export const visualAcuityBothEyesDataSchema = z.object({
  uncorrected: z.string().optional(),
  corrected: z.string().optional(),
});

export const visualAcuityDataSchema = z.object({
  od: visualAcuityEyeDataSchema.optional(), // Right Eye
  os: visualAcuityEyeDataSchema.optional(), // Left Eye
  ou: visualAcuityBothEyesDataSchema.optional(), // Both Eyes
  notes: z.string().optional(),
});
export type VisualAcuityData = z.infer<typeof visualAcuityDataSchema>;

export const iopDataSchema = z.object({
  od: z.number().optional(), // mmHg
  os: z.number().optional(), // mmHg
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

// ============================================================================
// Cardiology Exam Schemas
// ============================================================================

export const ecgDataSchema = z.object({
  heartRate: z.number().optional(), // bpm
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
  prInterval: z.number().optional(), // ms
  qrsDuration: z.number().optional(), // ms
  qtInterval: z.number().optional(), // ms
  qtcInterval: z.number().optional(), // ms (corrected QT)
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
  lvef: z.number().optional(), // %
  lviddDiastole: z.number().optional(), // mm
  lvisdSystole: z.number().optional(), // mm
  septumThickness: z.number().optional(), // mm
  posteriorWallThickness: z.number().optional(), // mm
  lvMass: z.number().optional(), // grams
  mitralValve: z.string().optional(),
  aorticValve: z.string().optional(),
  tricuspidValve: z.string().optional(),
  pulmonicValve: z.string().optional(),
  leftAtriumSize: z.number().optional(), // mm
  aorticRoot: z.number().optional(), // mm
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
  maxHeartRate: z.number().optional(), // bpm
  targetHeartRate: z.number().optional(), // bpm
  duration: z.number().optional(), // minutes
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

// ============================================================================
// Gynecology/Obstetrics Examination Schemas
// ============================================================================

// Menstrual History
export const menstrualHistoryDataSchema = z.object({
  lmp: z.string().optional(), // Last Menstrual Period (ISO date)
  cycleLength: z.number().optional(), // Days
  cycleDuration: z.number().optional(), // Days of bleeding
  regularity: z.enum(["regular", "irregular"]).optional(),
  flow: z.enum(["scanty", "normal", "heavy"]).optional(),
  dysmenorrhea: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  notes: z.string().optional(),
});
export type MenstrualHistoryData = z.infer<typeof menstrualHistoryDataSchema>;

// Obstetric History (GTPAL)
export const obstetricHistoryDataSchema = z.object({
  gravida: z.number().optional(), // Total pregnancies
  term: z.number().optional(), // Full-term deliveries (≥37 weeks)
  preterm: z.number().optional(), // Preterm deliveries (<37 weeks)
  abortions: z.number().optional(), // Spontaneous + induced abortions
  living: z.number().optional(), // Living children
  edd: z.string().optional(), // Expected Date of Delivery (ISO date)
  gestationalAge: z.string().optional(), // e.g., "28w 3d"
  previousPregnancyNotes: z.string().optional(),
});
export type ObstetricHistoryData = z.infer<typeof obstetricHistoryDataSchema>;

// Antenatal Record
export const antenatalRecordDataSchema = z.object({
  fundalHeight: z.number().optional(), // cm
  fetalHeartRate: z.number().optional(), // bpm
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
  cervicalDilation: z.number().optional(), // cm
  cervicalEffacement: z.number().optional(), // %
  notes: z.string().optional(),
});
export type AntenatalRecordData = z.infer<typeof antenatalRecordDataSchema>;

// Complete Gynecology Examination Data
export const gynecologyExamDataSchema = z.object({
  menstrualHistory: menstrualHistoryDataSchema.optional(),
  obstetricHistory: obstetricHistoryDataSchema.optional(),
  antenatalRecord: antenatalRecordDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type GynecologyExamData = z.infer<typeof gynecologyExamDataSchema>;

// ============================================================================
// Dermatology Examination Schemas
// ============================================================================

// Skin Assessment
export const skinAssessmentDataSchema = z.object({
  fitzpatrickType: z.enum(["I", "II", "III", "IV", "V", "VI"]).optional(),
  skinType: z
    .enum(["normal", "dry", "oily", "combination", "sensitive"])
    .optional(),
  generalCondition: z.string().optional(),
  notes: z.string().optional(),
});
export type SkinAssessmentData = z.infer<typeof skinAssessmentDataSchema>;

// Lesion Data
export const lesionDataSchema = z.object({
  id: z.string(),
  location: z.string(),
  bodyRegion: z.string().optional(),
  size: z.number().optional(), // mm
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

// Complete Dermatology Examination Data
export const dermatologyExamDataSchema = z.object({
  skinAssessment: skinAssessmentDataSchema.optional(),
  lesions: z.array(lesionDataSchema).optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type DermatologyExamData = z.infer<typeof dermatologyExamDataSchema>;

// ============================================================================
// Psychiatry Examination Schemas
// ============================================================================

// Mental Status Examination Schema
export const mseDataSchema = z.object({
  // Appearance & Behavior
  appearance: z.string().optional(),
  behavior: z.string().optional(),
  eyeContact: z.string().optional(),
  psychomotorActivity: z.string().optional(),

  // Speech
  speech: z.string().optional(),
  speechRate: z.enum(["normal", "slow", "rapid", "pressured"]).optional(),
  speechVolume: z.enum(["normal", "soft", "loud"]).optional(),

  // Mood & Affect
  mood: z.string().optional(),
  affect: z.string().optional(),
  affectType: z
    .enum(["full", "restricted", "blunted", "flat", "labile"])
    .optional(),
  affectCongruence: z.enum(["congruent", "incongruent"]).optional(),

  // Thought
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

  // Perception
  hallucinations: z.boolean().optional(),
  hallucinationType: z.string().optional(),
  hallucinationDescription: z.string().optional(),
  illusions: z.boolean().optional(),
  depersonalization: z.boolean().optional(),
  derealization: z.boolean().optional(),

  // Cognition
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

  // Insight & Judgment
  insight: z.enum(["good", "fair", "poor", "absent"]).optional(),
  insightDescription: z.string().optional(),
  judgment: z.enum(["good", "fair", "poor", "impaired"]).optional(),
  judgmentDescription: z.string().optional(),

  // Additional Notes
  notes: z.string().optional(),
});

// Risk Assessment Schema
export const riskAssessmentDataSchema = z.object({
  // Suicide Risk
  suicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  suicidalThoughts: z.boolean().optional(),
  suicidalPlan: z.boolean().optional(),
  suicidalIntent: z.boolean().optional(),
  suicidalMeans: z.boolean().optional(),
  previousAttempts: z.boolean().optional(),
  previousAttemptsDetails: z.string().optional(),
  protectiveFactors: z.string().optional(),

  // Homicide Risk
  homicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  homicidalThoughts: z.boolean().optional(),
  homicidalPlan: z.boolean().optional(),
  homicidalIntent: z.boolean().optional(),
  homicidalMeans: z.boolean().optional(),
  identifiedTarget: z.boolean().optional(),
  targetDetails: z.string().optional(),

  // Risk Management
  riskManagement: z.string().optional(),
  safetyPlan: z.string().optional(),
});

// Screening Scales Schema
export const screeningScalesDataSchema = z.object({
  // PHQ-9 (Depression)
  phq9Score: z.number().min(0).max(27).optional(),
  phq9Severity: z
    .enum(["minimal", "mild", "moderate", "moderately-severe", "severe"])
    .optional(),

  // GAD-7 (Anxiety)
  gad7Score: z.number().min(0).max(21).optional(),
  gad7Severity: z.enum(["minimal", "mild", "moderate", "severe"]).optional(),

  // YMRS (Mania)
  ymrsScore: z.number().min(0).max(60).optional(),

  // Other scales
  otherScales: z.string().optional(),
});

// Psychiatry Exam Data Schema (Combines all sub-schemas)
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

// Full Clinical Note in SOAP format
export const clinicalNoteSchema = z.object({
  // Subjective
  chiefComplaint: z.string().optional(),
  treatmentHistory: z.string().optional(), // Previous treatments attempted for the current condition
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),

  // Objective
  vitalSigns: vitalSignSchema.optional(),
  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),

  // Specialty-specific data
  dentalChart: dentalChartSchema.optional(),
  growthData: growthChartDataSchema.optional(),
  ophthalmologyExam: ophthalmologyExamDataSchema.optional(),
  cardiologyExam: cardiologyExamDataSchema.optional(),
  gynecologyExam: gynecologyExamDataSchema.optional(),
  dermatologyExam: dermatologyExamDataSchema.optional(),
  psychiatryExam: psychiatryExamDataSchema.optional(),

  // Assessment
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),

  // Plan
  investigations: z.array(clinicalInvestigationSchema).optional(),
  finalDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  prescriptions: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        route: z.string().default("PO"),
      }),
    )
    .optional(),
  followUpPlan: z.string().optional(),
  patientEducation: z.string().optional(),
});
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

// ============================================================================
// Clinical Templates
// ============================================================================

export const clinicalTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  speciality: z.string(),
  defaultObservations: z.string(),
  fields: z.array(z.record(z.unknown())).default([]),
  userId: z.string().optional(),
  clinicId: z.string().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type ClinicalTemplate = z.infer<typeof clinicalTemplateSchema>;
