import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  appointmentCancelRequestSchema,
  appointmentRescheduleRequestSchema,
  appointmentResponseSchema,
  createAppointmentRequestSchema,
  listAppointmentsQuerySchema,
  updateAppointmentRequestSchema,
  vitalSignSchema,
} from '@workspace/types';

export const CreateAppointmentSchema = createAppointmentRequestSchema;

export class CreateAppointmentDto extends createZodDto(
  CreateAppointmentSchema,
) {}

export const UpdateAppointmentSchema = updateAppointmentRequestSchema;

export class UpdateAppointmentDto extends createZodDto(
  UpdateAppointmentSchema,
) {}

export class CancelAppointmentDto extends createZodDto(
  appointmentCancelRequestSchema,
) {}

export class RescheduleAppointmentDto extends createZodDto(
  appointmentRescheduleRequestSchema,
) {}

export const ListAppointmentsQuerySchema = listAppointmentsQuerySchema;
export class ListAppointmentsQueryDto extends createZodDto(
  ListAppointmentsQuerySchema,
) {}

export class VitalsDto extends createZodDto(vitalSignSchema) {}

export class AppointmentResponseDto extends createZodDto(
  appointmentResponseSchema,
) {}

const PaginatedAppointmentResponseSchema = z.object({
  items: z.array(appointmentResponseSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});
export class PaginatedAppointmentResponseDto extends createZodDto(
  PaginatedAppointmentResponseSchema,
) {}

export class VitalSignResponseDto extends createZodDto(vitalSignSchema) {}
