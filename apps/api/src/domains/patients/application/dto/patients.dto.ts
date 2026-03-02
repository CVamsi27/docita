import { createZodDto } from 'nestjs-zod';
import {
  createPatientRequestSchema,
  updatePatientRequestSchema,
  listPatientsQuerySchema,
} from '@workspace/types';

export const CreatePatientSchema = createPatientRequestSchema;
export class CreatePatientDto extends createZodDto(CreatePatientSchema) {}

export const UpdatePatientSchema = updatePatientRequestSchema;
export class UpdatePatientDto extends createZodDto(UpdatePatientSchema) {}

export const ListPatientsQuerySchema = listPatientsQuerySchema;
export class ListPatientsQueryDto extends createZodDto(
  ListPatientsQuerySchema,
) {}
