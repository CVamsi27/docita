import { z } from "zod";
import { bpPositionSchema, oxygenDeliverySchema } from "./medical";

export const vitalSignSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  height: z.number().optional(), 
  weight: z.number().optional(), 
  bmi: z.number().optional(), 

  systolicBP: z
    .number()
    .min(60, "Enter 60 mmHg or higher.")
    .max(300, "Systolic BP cannot exceed 300 mmHg")
    .optional(),
  diastolicBP: z
    .number()
    .min(30, "Enter 30 mmHg or higher.")
    .max(200, "Diastolic BP cannot exceed 200 mmHg")
    .optional(),
  bpPosition: bpPositionSchema.optional(), 
  bloodPressure: z.string().optional(), 

  pulse: z.number().optional(), 
  respiratoryRate: z.number().optional(), 
  temperature: z.number().optional(), 

  spo2: z.number().optional(), 
  oxygenDelivery: oxygenDeliverySchema.optional(), 
  oxygenFlowRate: z.number().optional(), 

  painScore: z.number().min(0).max(10).optional(), 
  bloodGlucose: z.number().optional(), 
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

export const vitalSignSchemaRefined = vitalSignSchema.refine(
  (data) => {
    if (data.systolicBP && data.diastolicBP) {
      return data.systolicBP > data.diastolicBP;
    }
    return true;
  },
  {
    message: "Enter a systolic value higher than the diastolic value.",
    path: ["systolicBP"],
  },
);
