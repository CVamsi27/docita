import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { documentSchema } from '@workspace/types';

export class DocumentResponseDto extends createZodDto(documentSchema) {}

export class DocumentListResponseDto extends createZodDto(
  z.array(documentSchema),
) {}
