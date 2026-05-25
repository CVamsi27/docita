import { z } from "zod";
import { emailSchema, requiredStringSchema } from "./common";

export const contactSalesFormSchema = z.object({
  name: requiredStringSchema("Name"),
  email: emailSchema,
  clinic: z.string().optional(),
  message: requiredStringSchema("Message"),
});

export type ContactSalesFormValues = z.infer<typeof contactSalesFormSchema>;
