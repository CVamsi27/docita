import { z } from "zod";
import {
  currencyOptionSchema,
  durationOptionSchema,
  selectOptionSchema,
  statusOptionSchema,
  weekdayOptionSchema,
} from "./config-types.js";

export const appConfigSchema = z.object({
  formOptions: z.object({
    gender: z.array(selectOptionSchema),
    bloodGroup: z.array(selectOptionSchema),
    appointmentType: z.array(selectOptionSchema),
    appointmentStatus: z.array(statusOptionSchema),
    invoiceStatus: z.array(statusOptionSchema),
    paymentStatus: z.array(statusOptionSchema),
    userRole: z.array(selectOptionSchema),
    weekday: z.array(weekdayOptionSchema),
    customFieldType: z.array(selectOptionSchema),
    templateFieldType: z.array(selectOptionSchema),
    specialty: z.array(selectOptionSchema),
    documentType: z.array(selectOptionSchema),
    appointmentDuration: z.array(durationOptionSchema),
    whatsappMessageType: z.array(selectOptionSchema),
    currency: z.array(currencyOptionSchema),
    timezone: z.array(selectOptionSchema),
  }),
  defaults: z.object({
    appointmentDuration: z.number(),
    consultationFee: z.number(),
    currency: z.string(),
    timezone: z.string(),
    invoiceItems: z.array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        price: z.number(),
      }),
    ),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
