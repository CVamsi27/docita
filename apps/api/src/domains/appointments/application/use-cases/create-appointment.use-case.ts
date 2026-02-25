import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAppointmentRepository } from '../../core/repositories/appointment.repository.interface';
import { Appointment } from '../../core/entities/appointment.entity';
import { AppointmentStatus } from '../../core/value-objects/appointment-status.value-object';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAppointmentCommand {
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<Appointment> {
    if (command.startTime >= command.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const appointment = new Appointment({
      id: uuidv4(),
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
