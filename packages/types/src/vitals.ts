import { z } from "zod";
import { bpPositionSchema, oxygenDeliverySchema } from "./medical";

export const vitalSignSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  height: z.number().optional(), // in cm
  weight: z.number().optional(), // in kg
  bmi: z.number().optional(), // calculated BMI

  // Structured Blood Pressure (hospital-grade)
  systolicBP: z
    .number()
    .min(60, "Systolic BP must be at least 60 mmHg")
    .max(300, "Systolic BP cannot exceed 300 mmHg")
    .optional(),
  diastolicBP: z
    .number()
    .min(30, "Diastolic BP must be at least 30 mmHg")
    .max(200, "Diastolic BP cannot exceed 200 mmHg")
    .optional(),
  bpPosition: bpPositionSchema.optional(), // Position during measurement
  bloodPressure: z.string().optional(), // Legacy field: "120/80" format

  pulse: z.number().optional(), // bpm
  respiratoryRate: z.number().optional(), // breaths per minute
  temperature: z.number().optional(), // in Celsius

  // SpO2 with delivery method
  spo2: z.number().optional(), // percentage
  oxygenDelivery: oxygenDeliverySchema.optional(), // How O2 is delivered
  oxygenFlowRate: z.number().optional(), // L/min if on supplemental O2

  painScore: z.number().min(0).max(10).optional(), // 0-10 scale
  bloodGlucose: z.number().optional(), // mg/dL
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

// Vital Signs validation refinement for BP consistency
export const vitalSignSchemaRefined = vitalSignSchema.refine(
  (data) => {
    if (data.systolicBP && data.diastolicBP) {
      return data.systolicBP > data.diastolicBP;
    }
    return true;
  },
  {
    message: "Systolic BP must be greater than diastolic BP",
    path: ["systolicBP"],
  },
);
