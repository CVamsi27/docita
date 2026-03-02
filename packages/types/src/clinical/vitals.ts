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
    .min(60, "Systolic BP must be at least 60 mmHg")
    .max(300, "Systolic BP cannot exceed 300 mmHg")
    .optional(),
  diastolicBP: z
    .number()
    .min(30, "Diastolic BP must be at least 30 mmHg")
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
    message: "Systolic BP must be greater than diastolic BP",
    path: ["systolicBP"],
  },
);
