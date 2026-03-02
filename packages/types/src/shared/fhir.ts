import { z } from "zod";

export const FhirResourceSchema = z.record(z.unknown());
export const FhirBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.string(),
  entry: z
    .array(
      z.object({
        resource: FhirResourceSchema,
      }),
    )
    .optional(),
});
