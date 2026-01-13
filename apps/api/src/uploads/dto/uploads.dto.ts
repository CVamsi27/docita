import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { uploadSessionSchema } from '@workspace/types';

export class UploadSessionResponseDto extends createZodDto(
  uploadSessionSchema,
) {}
