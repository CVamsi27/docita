import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { type UpdateAppointmentRequest } from '@workspace/types';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from '@/domains/appointments/application/services/appointment-metrics.service';
import {
  coerceAppointmentDate,
  toPrismaAppointmentUpdate,
} from '@/domains/appointments/core/domain-services/appointment-update-patch.rules';

export type AppointmentForUpdate = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
};

export interface UpdateAppointmentDetailsCommand {
  appointmentId: string;
  clinicId: string;
  data: Partial<UpdateAppointmentRequest>;
  appointment: AppointmentForUpdate;
}

@Injectable()
export class UpdateAppointmentDetailsUseCase {
  private readonly logger = new Logger(UpdateAppointmentDetailsUseCase.name);

  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepository: IAppointmentWriteRepository,
    private readonly schedulingRules: AppointmentSchedulingRulesService,
    private readonly metricsService: AppointmentMetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateAppointmentDetailsCommand): Promise<void> {
    const { appointmentId, clinicId, data, appointment } = command;

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
        appointmentId,
      );
      if (overlap.hasConflict) {
        throw new BadRequestException('Doctor has conflicting appointment');
      }
    }

    const prismaPatch = toPrismaAppointmentUpdate(data);

    const count = await this.writeRepository.applyPatch(
      appointmentId,
      clinicId,
      prismaPatch,
    );
    if (count === 0) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    if (data.status === 'completed') {
      this.eventEmitter.emit(ApplicationEvents.APPOINTMENT_COMPLETED, {
        appointmentId,
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
      this.logger.log({
        action: 'appointment.details.update',
        appointmentId,
        clinicId,
        metricCount: observationMetrics.length,
      });

      await this.metricsService.recordObservationMetrics({
        clinicId,
        patientId: appointment.patientId,
        appointmentId,
        metrics: observationMetrics,
      });
    }
  }
}
