import { z } from "zod";
import { emailSchema, requiredStringSchema } from "./common";

// allow-no-base-schema: owner=landing reason=marketing-lead-form review=2026-09-30
export const contactSalesFormSchema = z.object({
  name: requiredStringSchema("Name"),
  email: emailSchema,
  clinic: z.string().optional(),
  message: requiredStringSchema("Message"),
});

export type ContactSalesFormValues = z.infer<typeof contactSalesFormSchema>;
