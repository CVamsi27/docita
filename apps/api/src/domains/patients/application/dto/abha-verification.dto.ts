import { createZodDto } from 'nestjs-zod';
import {
  abhaRequestOtpRequestSchema,
  abhaVerifyOtpRequestSchema,
  verifyAbhaRequestSchema,
} from '@workspace/types';

export class VerifyAbhaDto extends createZodDto(verifyAbhaRequestSchema) {}

const AbhaRequestOtpSchema = abhaRequestOtpRequestSchema;
export class AbhaRequestOtpDto extends createZodDto(AbhaRequestOtpSchema) {}

export class AbhaVerifyOtpDto extends createZodDto(
  abhaVerifyOtpRequestSchema,
) {}
