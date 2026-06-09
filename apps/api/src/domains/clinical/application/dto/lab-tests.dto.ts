import { createZodDto } from 'nestjs-zod';
import {
  createLabRequestSchema,
  createLabTestOrderRequestSchema,
  createLabTestRequestSchema,
  labStatsQuerySchema,
  listLabQueueQuerySchema,
  listLabTestOrdersQuerySchema,
  recordSampleCollectionRequestSchema,
  updateLabRequestSchema,
  updateLabTestOrderRequestSchema,
  updateLabTestRequestSchema,
  uploadLabResultRequestSchema,
  verifyLabOrderPaymentRequestSchema,
} from '@workspace/types';

export class CreateLabTestDto extends createZodDto(
  createLabTestRequestSchema,
) {}

export class UpdateLabTestDto extends createZodDto(
  updateLabTestRequestSchema,
) {}

export class CreateLabTestOrderDto extends createZodDto(
  createLabTestOrderRequestSchema,
) {}

export class UpdateLabTestOrderDto extends createZodDto(
  updateLabTestOrderRequestSchema,
) {}

export class ListLabTestOrdersQueryDto extends createZodDto(
  listLabTestOrdersQuerySchema,
) {}

export class LabStatsQueryDto extends createZodDto(labStatsQuerySchema) {}

export class ListLabQueueQueryDto extends createZodDto(
  listLabQueueQuerySchema,
) {}

export class RecordSampleCollectionDto extends createZodDto(
  recordSampleCollectionRequestSchema,
) {}

export class UploadLabResultDto extends createZodDto(
  uploadLabResultRequestSchema,
) {}

export class VerifyLabOrderPaymentDto extends createZodDto(
  verifyLabOrderPaymentRequestSchema,
) {}

export class CreateLabDto extends createZodDto(createLabRequestSchema) {}

export class UpdateLabDto extends createZodDto(updateLabRequestSchema) {}
