import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Role, VitalSign } from '@workspace/db';
import {
  type DiagnosisSyncItem,
  isFrontDeskWorkspace,
  parseWorkspaceProfile,
  type UpdateAppointmentRequest,
} from '@workspace/types';
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentQueryService } from './appointment-query.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import {
  coerceAppointmentDate,
  toPrismaAppointmentUpdate,
} from './appointment-command-helpers';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

const CONSULTATION_START_ALLOWED_STATUSES = new Set([
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
]);

/** Handles all write operations for appointments (create, update, cancel, reschedule). */
@Injectable()
export class AppointmentCommandService {
  constructor(
    private readonly queryService: AppointmentQueryService,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly schedulingRules: AppointmentSchedulingRulesService,
    private readonly metricsService: AppointmentMetricsService,
    private readonly diagnosisService: AppointmentDiagnosisService,
  ) {}

  async createAppointment(
    command: CreateAppointmentCommand,
  ): Promise<Appointment> {
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

    const appointment = await this.createAppointmentUseCase.execute(command);

    this.eventEmitter.emit(
      'appointment.created',
      new AppointmentCreatedEvent(
        appointment.id,
        appointment.clinicId,
        appointment.patientId,
        appointment,
      ),
    );

    return appointment;
  }

  async startConsultation(
    id: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<{ appointmentId: string; status: string }> {
    const clinicRow = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const clinicSettings =
      clinicRow?.settings && typeof clinicRow.settings === 'object'
        ? (clinicRow.settings as Record<string, unknown>)
        : {};
    if (
      isFrontDeskWorkspace(
        parseWorkspaceProfile(clinicSettings.workspaceProfile),
      )
    ) {
      throw new ForbiddenException(
        'Consultation start is not available for this workspace profile.',
      );
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        status: true,
        queueToken: {
          select: {
            id: true,
            status: true,
            calledAt: true,
            consultationStart: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (
      !accessContext?.userId ||
      (accessContext.role !== Role.DOCTOR &&
        accessContext.role !== Role.ADMIN_DOCTOR)
    ) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    if (appointment.doctorId !== accessContext.userId) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    if (!CONSULTATION_START_ALLOWED_STATUSES.has(appointment.status)) {
      throw new BadRequestException(
        'This consultation cannot be started from its current appointment status',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (appointment.status !== 'IN_PROGRESS') {
        const result = await tx.appointment.updateMany({
          where: { id, clinicId },
          data: {
            status: 'IN_PROGRESS',
            version: { increment: 1 },
          },
        });
        if (result.count === 0) {
          throw new NotFoundException(`Appointment with ID ${id} not found`);
        }
      }

      if (appointment.queueToken) {
        const startTime =
          appointment.queueToken.consultationStart ?? new Date();
        const calledAt = appointment.queueToken.calledAt ?? new Date();

        await tx.queueToken.update({
          where: { id: appointment.queueToken.id },
          data: {
            status: 'IN_PROGRESS',
            calledAt,
            consultationStart: startTime,
          },
        });
      }
    });

    return { appointmentId: appointment.id, status: 'in-progress' };
  }

  async cancelAppointment(
    id: string,
    reason: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.queryService.getAppointment(
      id,
      clinicId,
      accessContext,
    );
    appointment.cancel(reason);
    await this.appointmentRepository.update(appointment);
    return appointment;
  }

  async rescheduleAppointment(
    id: string,
    startTime: Date,
    endTime: Date,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<void> {
    const appointment = await this.queryService.getAppointment(
      id,
      clinicId,
      accessContext,
    );
    const overlap = await this.schedulingRules.validateAppointmentOverlap(
      appointment.doctorId,
      clinicId,
      startTime,
      endTime,
      id,
    );
    if (overlap.hasConflict) {
      throw new BadRequestException('Doctor has conflicting appointment');
    }
    appointment.reschedule(startTime, endTime);
    await this.appointmentRepository.update(appointment);
  }

  async updateAppointmentDetails(
    id: string,
    clinicId: string,
    data: Partial<UpdateAppointmentRequest>,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        doctorId: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (
      accessContext?.role === Role.DOCTOR &&
      accessContext.userId &&
      appointment.doctorId !== accessContext.userId
    ) {
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );
    }

    const touchesSchedule =
      data.startTime !== undefined || data.endTime !== undefined;
    if (touchesSchedule) {
      const nextStart = coerceAppointmentDate(
        data.startTime,
        appointment.startTime,
      );
      const nextEnd = coerceAppointmentDate(data.endTime, appointment.endTime);
      const nextDoctorId =
        typeof data.doctorId === 'string' && data.doctorId.trim() !== ''
          ? data.doctorId
          : appointment.doctorId;
      const overlap = await this.schedulingRules.validateAppointmentOverlap(
        nextDoctorId,
        clinicId,
        nextStart,
        nextEnd,
        id,
      );
      if (overlap.hasConflict) {
        throw new BadRequestException('Doctor has conflicting appointment');
      }
    }

    const prismaPatch = toPrismaAppointmentUpdate(data);

    const result = await this.prisma.appointment.updateMany({
      where: { id, clinicId },
      data: { ...prismaPatch, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (data.status === 'completed') {
      this.eventEmitter.emit('appointment.completed', {
        appointmentId: id,
        clinicId,
      });
    }

    const observations =
      typeof data.observations === 'string' ? data.observations.trim() : '';
    const consultationNotes =
      typeof data.consultationNotes === 'string'
        ? data.consultationNotes.trim()
        : '';

    const observationMetrics: Array<{
      definitionKey: string;
      definitionLabel: string;
      value: string;
    }> = [];

    if (observations) {
      observationMetrics.push({
        definitionKey: 'observations',
        definitionLabel: 'Observations',
        value: observations,
      });
    }

    if (consultationNotes) {
      observationMetrics.push({
        definitionKey: 'consultation_notes',
        definitionLabel: 'Consultation Notes',
        value: consultationNotes,
      });
    }

    if (observationMetrics.length > 0) {
      await this.metricsService.recordObservationMetrics({
        clinicId,
        patientId: appointment.patientId,
        appointmentId: id,
        metrics: observationMetrics,
      });
    }

    return this.queryService.getAppointment(id, clinicId, accessContext);
  }

  async syncDiagnoses(
    appointmentId: string,
    clinicId: string,
    diagnoses: DiagnosisSyncItem[],
    requestHash?: string,
  ): Promise<{ contentHash: string; skipped: boolean; count: number }> {
    return this.diagnosisService.syncDiagnoses(
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
    return this.metricsService.createVitals(
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
    return this.metricsService.updateVitals(
      appointmentId,
      clinicId,
      data,
      accessContext,
    );
  }
}
