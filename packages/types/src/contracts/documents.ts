import { z } from "zod";
import { documentSchema } from "../operations/document-types";

export const listDocumentsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  patientId: z.string().optional(),
});

export const documentContractResponseSchema = documentSchema;
export const listDocumentsContractResponseSchema = z.array(
  documentContractResponseSchema,
);

export type ListDocumentsContractQuery = z.infer<
  typeof listDocumentsQuerySchema
>;
export type DocumentContractResponse = z.infer<
  typeof documentContractResponseSchema
>;