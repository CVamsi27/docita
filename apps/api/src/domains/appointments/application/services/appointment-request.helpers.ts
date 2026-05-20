import { BadRequestException } from '@nestjs/common';
import type { AppointmentRequestResponse } from '@workspace/types';
import type { AppointmentRequestWithRelations } from '@/domains/appointments/core/repositories/appointment-request.repository.interface';

export function parseAppointmentRequestDate(
  value: string,
  fieldName: string,
): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
  return date;
}

export function mapAppointmentRequest(
  request: AppointmentRequestWithRelations,
): AppointmentRequestResponse {
  return {
    id: request.id,
    patientId: request.patientId,
    clinicId: request.clinicId,
    preferredDoctorId: request.preferredDoctorId,
    preferredDate: request.preferredDate,
    preferredTime: request.preferredTime,
    requestedSlotStart: request.requestedSlotStart ?? undefined,
    requestedSlotEnd: request.requestedSlotEnd ?? undefined,
    reason: request.reason,
    notes: request.notes,
    status: request.status,
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    responseMessage: request.responseMessage,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    patient: request.patient ?? undefined,
    preferredDoctor: request.preferredDoctor ?? undefined,
    reviewedBy: request.reviewedBy ?? undefined,
  };
}
