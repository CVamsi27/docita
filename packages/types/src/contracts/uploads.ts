import { z } from "zod";
import { uploadSessionSchema } from "../shared/uploads";

export const uploadSessionContractResponseSchema = uploadSessionSchema;

export type UploadSessionContractResponse = z.infer<
  typeof uploadSessionContractResponseSchema
>;