import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

interface RescheduleAppointmentCommand {
  appointment: Appointment;
  clinicId: string;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class RescheduleAppointmentUseCase {
  private readonly logger = new Logger(RescheduleAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepository: IAppointmentWriteRepository,
    private readonly schedulingRules: AppointmentSchedulingRulesService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(command: RescheduleAppointmentCommand): Promise<void> {
    const { appointment, clinicId, startTime, endTime } = command;

    if (startTime >= endTime)
      throw new BadRequestException('Start time must be before end time');

    // A reschedule is a postpone/move — the new slot must be in the future.
    // (Back-dating only makes sense when first recording a past visit, not when
    // moving an existing appointment.)
    if (startTime <= this.clock.now())
      throw new BadRequestException('Cannot reschedule to a past time');

    const overlap = await this.schedulingRules.validateAppointmentOverlap(
      appointment.doctorId,
      clinicId,
      startTime,
      endTime,
      appointment.id,
    );
    if (overlap.hasConflict)
      throw new BadRequestException('Doctor has conflicting appointment');

    this.logger.log({
      action: 'appointment.reschedule',
      appointmentId: appointment.id,
      clinicId,
    });

    appointment.reschedule(startTime, endTime, this.clock.now());
    await this.writeRepository.update(appointment);
  }
}
