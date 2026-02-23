import { z } from "zod";

// FHIR resources are complex and nested. For now, we define a loose schema
// that ensures we are returning an object (Resource) but allow flexibility.
// In a strict implementation, we would import standard FHIR definitions.

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
