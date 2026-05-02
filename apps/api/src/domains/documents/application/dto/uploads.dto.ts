import { createZodDto } from 'nestjs-zod';
import {
  uploadSessionContractResponseSchema,
  uploadSessionCreateContractResponseSchema,
} from '@workspace/types';

export class UploadSessionResponseDto extends createZodDto(
  uploadSessionContractResponseSchema,
) {}

export class UploadSessionCreateResponseDto extends createZodDto(
  uploadSessionCreateContractResponseSchema,
) {}
