import { z } from "zod";
import { uploadSessionSchema } from "../shared/uploads";

export const uploadSessionContractResponseSchema = uploadSessionSchema;

export const uploadSessionCreateContractResponseSchema =
  uploadSessionSchema.extend({
    uploadSecret: z.string(),
  });

export type UploadSessionContractResponse = z.infer<
  typeof uploadSessionContractResponseSchema
>;

export type UploadSessionCreateContractResponse = z.infer<
  typeof uploadSessionCreateContractResponseSchema
>;
