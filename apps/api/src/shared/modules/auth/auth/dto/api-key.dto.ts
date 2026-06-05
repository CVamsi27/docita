import { createZodDto } from 'nestjs-zod';
import { createApiKeySchema, rotateApiKeySchema } from '@workspace/types';

export class CreateApiKeyDto extends createZodDto(createApiKeySchema) {}
export class RotateApiKeyDto extends createZodDto(rotateApiKeySchema) {}
