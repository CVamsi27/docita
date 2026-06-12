import { createZodDto } from 'nestjs-zod';
import {
  abdmCareContextSchema,
  abdmConsentRequestSchema,
  abdmExternalRecordSchema,
  abdmGatewayCallbackSchema,
  abdmOpsInboxSchema,
  createAbdmCareContextRequestSchema,
  createAbdmConsentRequestSchema,
} from '@workspace/types';

export class CreateAbdmCareContextDto extends createZodDto(
  createAbdmCareContextRequestSchema,
) {}

export class AbdmCareContextResponseDto extends createZodDto(
  abdmCareContextSchema,
) {}

export class AbdmCareContextListResponseDto extends createZodDto(
  abdmCareContextSchema.array(),
) {}

export class CreateAbdmConsentRequestDto extends createZodDto(
  createAbdmConsentRequestSchema,
) {}

export class AbdmConsentRequestResponseDto extends createZodDto(
  abdmConsentRequestSchema,
) {}

export class AbdmOpsInboxResponseDto extends createZodDto(abdmOpsInboxSchema) {}

export class AbdmExternalRecordListResponseDto extends createZodDto(
  abdmExternalRecordSchema.array(),
) {}

export class AbdmGatewayCallbackDto extends createZodDto(
  abdmGatewayCallbackSchema,
) {}
