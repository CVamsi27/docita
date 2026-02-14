import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const VerifyBackupSchema = z.object({
  filepath: z.string().min(1, 'Filepath is required'),
});

export class VerifyBackupRequestDto extends createZodDto(VerifyBackupSchema) {}
