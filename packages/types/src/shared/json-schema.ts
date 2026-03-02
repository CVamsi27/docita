import { z } from "zod";

export const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type JsonSchemaPrimitive = z.infer<typeof jsonPrimitiveSchema>;

export type JsonValueSchemaType =
  | JsonSchemaPrimitive
  | { [key: string]: JsonValueSchemaType }
  | JsonValueSchemaType[];

export const jsonValueSchema: z.ZodType<JsonValueSchemaType> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(jsonValueSchema)]),
);

export const jsonObjectSchema = z.record(jsonValueSchema);
