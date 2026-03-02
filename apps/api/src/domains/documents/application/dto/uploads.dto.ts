import { createZodDto } from 'nestjs-zod';
import { uploadSessionContractResponseSchema } from '@workspace/types';

export class UploadSessionResponseDto extends createZodDto(
  uploadSessionContractResponseSchema,
) {}
