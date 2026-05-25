import { z } from "zod";
import {
  appointmentStatusSchema,
  appointmentTypeSchema,
} from "../shared/users";
import { patientSchema } from "../patient/patients";
import { vitalSignSchema } from "../clinical/vitals";
import { invoiceSchema } from "../billing/invoices";
import { prescriptionSchema } from "../clinical/medications";
import {
  cardiologyExamDataSchema,
  clinicalInvestigationSchema,
  clinicalNoteSchema,
  dentalChartSchema,
  dermatologyExamDataSchema,
  generalExaminationSchema,
  growthChartDataSchema,
  gynecologyExamDataSchema,
  ophthalmologyExamDataSchema,
  psychiatryExamDataSchema,
  systemicExaminationSchema,
} from "../clinical/clinical";
import { cptCodeSchema, icdCodeSchema } from "../shared/medical-coding";
import { stripHtmlTags } from "../api/sanitization";
export const appointmentPrioritySchema = z.enum([
  "ROUTINE",
  "URGENT",
  "EMERGENCY",
]);
export type AppointmentPriority = z.infer<typeof appointmentPrioritySchema>;

export const APPOINTMENT_PRIORITY_LABELS: Record<AppointmentPriority, string> =
  {
    ROUTINE: "Routine",
    URGENT: "Urgent",
    EMERGENCY: "Emergency",
  };

export const APPOINTMENT_PRIORITY_COLORS: Record<AppointmentPriority, string> =
  {
    ROUTINE: "badge-info",
    URGENT: "badge-warning",
    EMERGENCY: "badge-danger",
  };

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Select a patient."),
  doctorId: z.string().min(1, "Select a doctor."),
  clinicId: z.string().min(1, "Select a clinic."),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,
  priority: appointmentPrioritySchema.default("ROUTINE").optional(),

  consultationNotes: z.string().max(10000).optional().transform(stripHtmlTags),

  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  observations: z.string().max(2000).optional().transform(stripHtmlTags),

  chiefComplaint: z.string().max(20000).optional().transform(stripHtmlTags),
  historyOfPresentIllness: z
    .string()
    .max(5000)
    .optional()
    .transform(stripHtmlTags),
  pastMedicalHistory: z.string().max(5000).optional().transform(stripHtmlTags),
  reviewOfSystems: z.string().max(5000).optional().transform(stripHtmlTags),

  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),

  provisionalDiagnosis: z
    .string()
    .max(1000)
    .optional()
    .transform(stripHtmlTags),
  differentialDiagnosis: z
    .string()
    .max(2000)
    .optional()
    .transform(stripHtmlTags),
  clinicalImpression: z.string().max(2000).optional().transform(stripHtmlTags),

  investigations: z.array(clinicalInvestigationSchema).optional(),
  finalDiagnosis: z.string().max(1000).optional().transform(stripHtmlTags),
  treatmentPlan: z.string().max(5000).optional().transform(stripHtmlTags),
  followUpPlan: z.string().max(2000).optional().transform(stripHtmlTags),
  dentalChart: dentalChartSchema.optional(),
  growthData: growthChartDataSchema.optional(),
  ophthalmologyExam: ophthalmologyExamDataSchema.optional(),
  cardiologyExam: cardiologyExamDataSchema.optional(),
  gynecologyExam: gynecologyExamDataSchema.optional(),
  dermatologyExam: dermatologyExamDataSchema.optional(),
  psychiatryExam: psychiatryExamDataSchema.optional(),

  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),

  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string().max(100) }).optional(),
  vitalSign: vitalSignSchema.optional(),
  prescription: prescriptionSchema.optional(),
  invoice: invoiceSchema.optional(),
  diagnoses: z
    .array(
      z.object({
        id: z.string(),
        icdCodeId: z.string(),
        icdCode: icdCodeSchema.optional(),
        notes: z.string().optional(),
        isPrimary: z.boolean(),
        createdAt: z.string().or(z.date()),
      }),
    )
    .optional(),
  reminders: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        status: z.string(),
        sentAt: z.string().or(z.date()).nullable().optional(),
        error: z.string().nullable().optional(),
        createdAt: z.string().or(z.date()),
      }),
    )
    .optional(),
  procedures: z
    .array(
      z.object({
        id: z.string(),
        cptCodeId: z.string(),
        cptCode: cptCodeSchema.optional(),
        notes: z.string().optional(),
        createdAt: z.string().or(z.date()),
        updatedAt: z.string().or(z.date()),
      }),
    )
    .optional(),
  });
export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentBaseSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  patient: true,
  doctor: true,
  vitalSign: true,
  prescription: true,
  invoice: true,
  diagnoses: true,
  procedures: true,
  reminders: true,

  chiefComplaint: true,
  historyOfPresentIllness: true,
  pastMedicalHistory: true,
  reviewOfSystems: true,
  generalExamination: true,
  systemicExamination: true,
  dentalChart: true,
  growthData: true,
  ophthalmologyExam: true,
  cardiologyExam: true,
  gynecologyExam: true,
  dermatologyExam: true,
  psychiatryExam: true,
});

/**
 * Fallback wall timezone for generated `createAppointmentSchema` only.
 * Clinician scheduling forms should super-refine with `refineCreateAppointmentDateTimes(clinicTz)`.
 */
const APPOINTMENT_FORM_WALL_TIMEZONE = "Asia/Kolkata";
const APPOINTMENT_LOCAL_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return asUtc - date.getTime();
}

function parseAppointmentWallDateTime(
  value: string,
  wallTimezone: string,
): Date | undefined {
  const match = APPOINTMENT_LOCAL_DATETIME_PATTERN.exec(value);
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, wallTimezone);
  const zonedInstant = new Date(utcGuess.getTime() - offsetMs);
  const correctedOffsetMs = getTimeZoneOffsetMs(zonedInstant, wallTimezone);

  return new Date(utcGuess.getTime() - correctedOffsetMs);
}

function normalizeAppointmentDate(
  value: string | Date,
  wallTimezone: string,
): Date | undefined {
  if (value === "" || value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const s = String(value).trim();
  if (!s) {
    return undefined;
  }
  if (APPOINTMENT_LOCAL_DATETIME_PATTERN.test(s)) {
    const parsedWallDate = parseAppointmentWallDateTime(s, wallTimezone);
    return parsedWallDate && !Number.isNaN(parsedWallDate.getTime())
      ? parsedWallDate
      : undefined;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function refineCreateAppointmentDateTimes(wallTimezone: string) {
  return (
    data: z.infer<typeof createAppointmentBaseSchema>,
    ctx: z.RefinementCtx,
  ): void => {
    const startTime = normalizeAppointmentDate(data.startTime, wallTimezone);
    const endTime =
      typeof data.endTime === "string" && data.endTime.trim() === ""
        ? undefined
        : normalizeAppointmentDate(data.endTime, wallTimezone);
    const now = new Date();

    if (!startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Enter a valid start time.",
      });
      return;
    }

    if (startTime.getTime() < now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Start time cannot be in the past.",
      });
    }

    if (endTime && endTime.getTime() <= startTime.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }
  };
}

export const createAppointmentSchema = createAppointmentBaseSchema.superRefine(
  refineCreateAppointmentDateTimes(APPOINTMENT_FORM_WALL_TIMEZONE),
);
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentBaseSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const updateClinicalNoteSchema = clinicalNoteSchema;
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;
