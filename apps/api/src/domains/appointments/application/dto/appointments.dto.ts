import { createZodDto } from 'nestjs-zod';
import {
  appointmentCancelRequestSchema,
  appointmentRescheduleRequestSchema,
  appointmentResponseSchema,
  appointmentRequestListResponseSchema,
  createAppointmentRequestSchema,
  approveAppointmentRequestSchema,
  bookFollowUpRequestSchema,
  createFollowUpRequestSchema,
  diagnosesSyncRequestSchema,
  diagnosesSyncResponseSchema,
  followUpResponseSchema,
  listAppointmentRequestsQuerySchema,
  listAppointmentsQuerySchema,
  listAppointmentsResponseSchema,
  listFollowUpsQuerySchema,
  patientAppointmentRequestCreateSchema,
  rejectAppointmentRequestSchema,
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

export class CreateFollowUpDto extends createZodDto(
  createFollowUpRequestSchema,
) {}

export class ListFollowUpsQueryDto extends createZodDto(
  listFollowUpsQuerySchema,
) {}

export class BookFollowUpDto extends createZodDto(bookFollowUpRequestSchema) {}

export class FollowUpResponseDto extends createZodDto(followUpResponseSchema) {}

export class PatientAppointmentRequestCreateDto extends createZodDto(
  patientAppointmentRequestCreateSchema,
) {}

export class ListAppointmentRequestsQueryDto extends createZodDto(
  listAppointmentRequestsQuerySchema,
) {}

export class ApproveAppointmentRequestDto extends createZodDto(
  approveAppointmentRequestSchema,
) {}

export class RejectAppointmentRequestDto extends createZodDto(
  rejectAppointmentRequestSchema,
) {}

export class AppointmentRequestListResponseDto extends createZodDto(
  appointmentRequestListResponseSchema,
) {}

export class PaginatedAppointmentResponseDto extends createZodDto(
  listAppointmentsResponseSchema,
) {}

export class VitalSignResponseDto extends createZodDto(vitalSignSchema) {}

export class DiagnosesSyncDto extends createZodDto(
  diagnosesSyncRequestSchema,
) {}

export class DiagnosesSyncResponseDto extends createZodDto(
  diagnosesSyncResponseSchema,
) {}
