import { createZodDto } from 'nestjs-zod';
import {
  abhaRequestOtpRequestSchema,
  abhaSearchByMobileRequestSchema,
  abhaVerifyOtpRequestSchema,
  verifyAbhaRequestSchema,
} from '@workspace/types';

export class VerifyAbhaDto extends createZodDto(verifyAbhaRequestSchema) {}

export class AbhaSearchByMobileDto extends createZodDto(
  abhaSearchByMobileRequestSchema,
) {}

export class AbhaRequestOtpDto extends createZodDto(
  abhaRequestOtpRequestSchema,
) {}

export class AbhaVerifyOtpDto extends createZodDto(
  abhaVerifyOtpRequestSchema,
) {}
