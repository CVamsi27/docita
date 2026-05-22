import { z } from "zod";

export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
