import { createZodDto } from 'nestjs-zod';
import { internalUpdateClinicAIFeaturesRequestSchema } from '@workspace/types';

export const UpdateAIFeaturesSchema = internalUpdateClinicAIFeaturesRequestSchema;
export class UpdateAIFeaturesDto extends createZodDto(UpdateAIFeaturesSchema) {}
