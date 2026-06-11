import { createZodDto } from 'nestjs-zod';
import { verifyAbhaRequestSchema } from '@workspace/types';

export class VerifyAbhaDto extends createZodDto(verifyAbhaRequestSchema) {}
