import { createZodDto } from 'nestjs-zod';
import {
  createLabTestOrderRequestSchema,
  createLabTestRequestSchema,
  labStatsQuerySchema,
  listLabTestOrdersQuerySchema,
  updateLabTestOrderRequestSchema,
} from '@workspace/types';

export class CreateLabTestDto extends createZodDto(
  createLabTestRequestSchema,
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
