import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

export interface CancelAppointmentCommand {
  appointment: Appointment;
  reason: string;
}

@Injectable()
export class CancelAppointmentUseCase {
  private readonly logger = new Logger(CancelAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepository: IAppointmentWriteRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(command: CancelAppointmentCommand): Promise<Appointment> {
    const { appointment, reason } = command;

    this.logger.log({
      action: 'appointment.cancel',
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
    });

    appointment.cancel(reason, this.clock.now());
    await this.writeRepository.update(appointment);
    return appointment;
  }
}
