import { createZodDto } from 'nestjs-zod';
import { slaSignatureSessionStatusResponseSchema } from '@workspace/types';

export class SlaSignatureSessionStatusDto extends createZodDto(
  slaSignatureSessionStatusResponseSchema,
) {}
