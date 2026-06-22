import { createZodDto } from 'nestjs-zod';
import {
  guidedTourStateSchema,
  updateGuidedTourRequestSchema,
} from '@workspace/types';

export const UpdateGuidedTourSchema = updateGuidedTourRequestSchema;

export class UpdateGuidedTourDto extends createZodDto(UpdateGuidedTourSchema) {}

export class GuidedTourStateDto extends createZodDto(guidedTourStateSchema) {}
