import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import type { JsonValue } from '@workspace/types';
import { randomUUID } from 'crypto';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

export interface CreateAppointmentCommand {
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  type?: string;
  metadata?: Record<string, JsonValue | undefined>;
  advance?: {
    amountCents: number;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
  };
}

@Injectable()
export class CreateAppointmentUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentWriteRepository,
    private readonly schedulingRules: AppointmentSchedulingRulesService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<Appointment> {
    if (command.startTime >= command.endTime)
      throw new BadRequestException('Start time must be before end time');

    const overlap = await this.schedulingRules.validateAppointmentOverlap(
      command.doctorId,
      command.clinicId,
      command.startTime,
      command.endTime,
    );
    if (overlap.hasConflict) {
      throw new BadRequestException({
        detail: 'Doctor has conflicting appointment',
        validationErrors: overlap.conflict
          ? {
              startTime: `Overlaps with appointment ${overlap.conflict.id} (${overlap.conflict.startTime.toISOString()}–${overlap.conflict.endTime.toISOString()})`,
            }
          : undefined,
      });
    }

    // AuditLogged: appointment creation
    this.logger.log({
      action: 'appointment.create',
      clinicId: command.clinicId,
      patientId: command.patientId,
      doctorId: command.doctorId,
    });

    const appointment = new Appointment({
      id: randomUUID(),
      clinicId: command.clinicId,
      patientId: command.patientId,
      doctorId: command.doctorId,
      startTime: command.startTime,
      endTime: command.endTime,
      status: AppointmentStatus.scheduled(),
      reason: command.reason,
      type: command.type || 'Standard',
      metadata: command.metadata || {},
      advance:
        command.advance && command.advance.amountCents > 0
          ? command.advance
          : undefined,
      createdAt: this.clock.now(),
      updatedAt: this.clock.now(),
      version: 1,
    });

    await this.appointmentRepository.save(appointment);

    return appointment;
  }
}
