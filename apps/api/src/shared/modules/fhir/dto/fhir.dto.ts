import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FhirResourceSchema, FhirBundleSchema } from '@workspace/types';

export class FhirResourceDto extends createZodDto(FhirResourceSchema) {}
export class FhirBundleDto extends createZodDto(FhirBundleSchema) {}

export class FhirResourceListDto extends createZodDto(
  z.array(FhirResourceSchema),
) {}
