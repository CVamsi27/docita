import { jest } from '@jest/globals';
import { CancelAppointmentUseCase } from '@/domains/appointments/application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '@/domains/appointments/application/use-cases/reschedule-appointment.use-case';
import { StartConsultationUseCase } from '@/domains/appointments/application/use-cases/start-consultation.use-case';
import { UpdateAppointmentDetailsUseCase } from '@/domains/appointments/application/use-cases/update-appointment-details.use-case';

/** Minimal stubs for specs that construct {@link AppointmentService} manually. */
export function createStubAppointmentWriteUseCases(): {
  cancelAppointmentUseCase: CancelAppointmentUseCase;
  rescheduleAppointmentUseCase: RescheduleAppointmentUseCase;
  startConsultationUseCase: StartConsultationUseCase;
  updateAppointmentDetailsUseCase: UpdateAppointmentDetailsUseCase;
} {
  return {
    cancelAppointmentUseCase: {
      execute: jest.fn(),
    } as unknown as CancelAppointmentUseCase,
    rescheduleAppointmentUseCase: {
      execute: jest.fn(),
    } as unknown as RescheduleAppointmentUseCase,
    startConsultationUseCase: {
      execute: jest.fn(),
    } as unknown as StartConsultationUseCase,
    updateAppointmentDetailsUseCase: {
      execute: jest.fn(),
    } as unknown as UpdateAppointmentDetailsUseCase,
  };
}
