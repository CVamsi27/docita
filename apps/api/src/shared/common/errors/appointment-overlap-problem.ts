import { BadRequestException } from '@nestjs/common';
import {
  appointmentOverlapErrorSchema,
  type AppointmentOverlapError,
} from '@workspace/types';

export function appointmentOverlapProblem(): BadRequestException {
  const detail = 'Doctor has conflicting appointment';
  const payload: AppointmentOverlapError = appointmentOverlapErrorSchema.parse({
    code: appointmentOverlapErrorSchema.shape.code.value,
    detail,
    validationErrors: { startTime: detail },
  });
  return new BadRequestException(payload);
}
