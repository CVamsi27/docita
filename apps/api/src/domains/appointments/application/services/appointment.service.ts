import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { VitalSign, Role } from '@workspace/db';
import {
  type DiagnosisSyncItem,
  type UpdateAppointmentRequest,
} from '@workspace/types';
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
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
 * so existing tests that call `new AppointmentService(...)` continue to work.
 */
@Injectable()
export class AppointmentService {
  private readonly queryService: AppointmentQueryService;
  private readonly commandService: AppointmentCommandService;

  constructor(
    @Inject('IAppointmentRepository')
    appointmentRepository: IAppointmentRepository,
    createAppointmentUseCase: CreateAppointmentUseCase,
    prisma: PrismaService,
    eventEmitter: EventEmitter2,
    schedulingRules: AppointmentSchedulingRulesService,
    metricsService: AppointmentMetricsService,
    diagnosisService: AppointmentDiagnosisService,
  ) {
    this.queryService = new AppointmentQueryService(
      appointmentRepository,
      prisma,
    );
    this.commandService = new AppointmentCommandService(
      this.queryService,
      appointmentRepository,
      createAppointmentUseCase,
      eventEmitter,
      schedulingRules,
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

  async listAppointments(
    params: AppointmentSearchParams & { calendarPickerDate?: string },
  ) {
    return this.queryService.listAppointments(params);
  }

  async startConsultation(
    id: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<{ appointmentId: string; status: string }> {
    return this.commandService.startConsultation(id, clinicId, accessContext);
  }

  async cancelAppointment(
    id: string,
    reason: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
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
    accessContext?: AppointmentAccessContext,
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
    accessContext?: AppointmentAccessContext,
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
    accessContext?: AppointmentAccessContext,
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
    accessContext?: AppointmentAccessContext,
  ): Promise<VitalSign> {
    return this.commandService.updateVitals(
      appointmentId,
      clinicId,
      data,
      accessContext,
    );
  }
}
