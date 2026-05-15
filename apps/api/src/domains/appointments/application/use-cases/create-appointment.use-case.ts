import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { JsonValue } from '@workspace/types';
import { randomUUID } from 'crypto';

export interface CreateAppointmentCommand {
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  type?: string;
  metadata?: Record<string, JsonValue | undefined>;
}

@Injectable()
export class CreateAppointmentUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<Appointment> {
    if (command.startTime >= command.endTime) {
      throw new BadRequestException('Start time must be before end time');
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    await this.appointmentRepository.save(appointment);

    return appointment;
  }
}
