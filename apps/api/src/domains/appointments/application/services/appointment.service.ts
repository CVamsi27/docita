// jscpd:ignore-start
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentReadRepository,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { AppointmentSearchParams } from '@/domains/appointments/core/repositories/appointment-repository.types';
import { VitalSign, Role } from '@workspace/db';
import {
  type DiagnosisSyncItem,
  type UpdateAppointmentRequest,
} from '@workspace/types';
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { CancelAppointmentUseCase } from '@/domains/appointments/application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '@/domains/appointments/application/use-cases/reschedule-appointment.use-case';
import { StartConsultationUseCase } from '@/domains/appointments/application/use-cases/start-consultation.use-case';
import { UpdateAppointmentDetailsUseCase } from '@/domains/appointments/application/use-cases/update-appointment-details.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentQueryService } from './appointment-query.service';
import { AppointmentCommandService } from './appointment-command.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

/**
 * Thin facade that delegates to AppointmentQueryService and
 * AppointmentCommandService. Keeps the original 5-arg constructor signature
 * so existing tests that call `new AppointmentService(read, write, ...)` can pass
 * the same composite mock for both ports.
 */
@Injectable()
export class AppointmentService {
  private readonly queryService: AppointmentQueryService;
  private readonly commandService: AppointmentCommandService;

  constructor(
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    readRepository: IAppointmentReadRepository,
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    writeRepository: IAppointmentWriteRepository,
    createAppointmentUseCase: CreateAppointmentUseCase,
    cancelAppointmentUseCase: CancelAppointmentUseCase,
    rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    startConsultationUseCase: StartConsultationUseCase,
    updateAppointmentDetailsUseCase: UpdateAppointmentDetailsUseCase,
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    prisma: AppointmentPersistencePort,
    eventEmitter: EventEmitter2,
    metricsService: AppointmentMetricsService,
    diagnosisService: AppointmentDiagnosisService,
  ) {
    this.queryService = new AppointmentQueryService(readRepository, prisma);
    this.commandService = new AppointmentCommandService(
      this.queryService,
      readRepository,
      writeRepository,
      createAppointmentUseCase,
      cancelAppointmentUseCase,
      rescheduleAppointmentUseCase,
      startConsultationUseCase,
      updateAppointmentDetailsUseCase,
      eventEmitter,
      metricsService,
      diagnosisService,
    );
  }

  async createAppointment(
    command: CreateAppointmentCommand,
  ): Promise<Appointment> {
    return this.commandService.createAppointment(command);
  }

  async getAppointment(
    id: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    return this.queryService.getAppointment(id, clinicId, accessContext);
  }

  async getClinicTimezone(clinicId: string): Promise<string> {
    return this.queryService.getClinicTimezone(clinicId);
  }

  async listAppointments(
    params: AppointmentSearchParams & {
      calendarPickerDate?: string;
      calendarRangeStartPicker?: string;
      calendarRangeEndPicker?: string;
    },
  ) {
    return this.queryService.listAppointments(params);
  }

  async startConsultation(
    id: string,
    clinicId: string,
    accessContext: AppointmentAccessContext,
  ): Promise<{ appointmentId: string; status: string }> {
    return this.commandService.startConsultation(id, clinicId, accessContext);
  }

  async cancelAppointment(
    id: string,
    reason: string,
    clinicId: string,
    accessContext: AppointmentAccessContext,
  ): Promise<Appointment> {
    return this.commandService.cancelAppointment(
      id,
      reason,
      clinicId,
      accessContext,
    );
  }

  async rescheduleAppointment(
    id: string,
    startTime: Date,
    endTime: Date,
    clinicId: string,
    accessContext: AppointmentAccessContext,
  ): Promise<void> {
    return this.commandService.rescheduleAppointment(
      id,
      startTime,
      endTime,
      clinicId,
      accessContext,
    );
  }

  async updateAppointmentDetails(
    id: string,
    clinicId: string,
    data: Partial<UpdateAppointmentRequest>,
    accessContext: AppointmentAccessContext,
  ): Promise<Appointment> {
    return this.commandService.updateAppointmentDetails(
      id,
      clinicId,
      data,
      accessContext,
    );
  }

  async syncDiagnoses(
    appointmentId: string,
    clinicId: string,
    diagnoses: DiagnosisSyncItem[],
    requestHash?: string,
  ): Promise<{ contentHash: string; skipped: boolean; count: number }> {
    return this.commandService.syncDiagnoses(
      appointmentId,
      clinicId,
      diagnoses,
      requestHash,
    );
  }

  async createVitals(
    appointmentId: string,
    clinicId: string,
    data: Partial<VitalSign>,
    accessContext: AppointmentAccessContext,
  ): Promise<VitalSign> {
    return this.commandService.createVitals(
      appointmentId,
      clinicId,
      data,
      accessContext,
    );
  }

  async updateVitals(
    appointmentId: string,
    clinicId: string,
    data: Partial<VitalSign>,
    accessContext: AppointmentAccessContext,
    // jscpd:ignore-end
  ): Promise<VitalSign> {
    return this.commandService.updateVitals(
      appointmentId,
      clinicId,
      data,
      accessContext,
    );
  }
}
