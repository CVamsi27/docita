import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  formOptionsSchema,
  appConfigSchema,
  patientImportFieldsSchema,
} from '@workspace/types';

export class FormOptionsResponseDto extends createZodDto(formOptionsSchema) {}
export class AppConfigResponseDto extends createZodDto(appConfigSchema) {}
export class PatientImportFieldsResponseDto extends createZodDto(
  patientImportFieldsSchema,
) {}

export class AppConstantsResponseDto extends createZodDto(z.record(z.any())) {}
export class AppDefaultsResponseDto extends createZodDto(z.record(z.any())) {}
