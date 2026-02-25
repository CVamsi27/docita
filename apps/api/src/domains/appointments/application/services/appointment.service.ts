/**
 * Appointment Application Service
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
} from '../../core/repositories/appointment.repository.interface';
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from '../use-cases/create-appointment.use-case';
import { Appointment } from '../../core/entities/appointment.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
  ) {}

  async createAppointment(
    command: CreateAppointmentCommand,
  ): Promise<Appointment> {
    return this.createAppointmentUseCase.execute(command);
  }

  async getAppointment(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
    return appointment;
  }

  async listAppointments(params: AppointmentSearchParams) {
    return this.appointmentRepository.findAll(params);
  }

  async cancelAppointment(id: string, reason: string): Promise<void> {
    const appointment = await this.getAppointment(id);
    appointment.cancel(reason);
    await this.appointmentRepository.update(appointment);
  }

  async rescheduleAppointment(
    id: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const appointment = await this.getAppointment(id);
    appointment.reschedule(startTime, endTime);
    await this.appointmentRepository.update(appointment);
  }
}
