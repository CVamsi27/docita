import { CancelAppointmentUseCase } from '@/domains/appointments/application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '@/domains/appointments/application/use-cases/reschedule-appointment.use-case';
import { StartConsultationUseCase } from '@/domains/appointments/application/use-cases/start-consultation.use-case';
import { UpdateAppointmentDetailsUseCase } from '@/domains/appointments/application/use-cases/update-appointment-details.use-case';
import { stubUseCase } from '@/domains/appointments/application/services/appointment-use-case.stub-factory';

/** Minimal stubs for specs that construct {@link AppointmentService} manually. */
export function createStubAppointmentWriteUseCases(): {
  cancelAppointmentUseCase: CancelAppointmentUseCase;
  rescheduleAppointmentUseCase: RescheduleAppointmentUseCase;
  startConsultationUseCase: StartConsultationUseCase;
  updateAppointmentDetailsUseCase: UpdateAppointmentDetailsUseCase;
} {
  return {
    cancelAppointmentUseCase: stubUseCase(CancelAppointmentUseCase.prototype),
    rescheduleAppointmentUseCase: stubUseCase(
      RescheduleAppointmentUseCase.prototype,
    ),
    startConsultationUseCase: stubUseCase(StartConsultationUseCase.prototype),
    updateAppointmentDetailsUseCase: stubUseCase(
      UpdateAppointmentDetailsUseCase.prototype,
    ),
  } as unknown as {
    cancelAppointmentUseCase: CancelAppointmentUseCase;
    rescheduleAppointmentUseCase: RescheduleAppointmentUseCase;
    startConsultationUseCase: StartConsultationUseCase;
    updateAppointmentDetailsUseCase: UpdateAppointmentDetailsUseCase;
  };
}
