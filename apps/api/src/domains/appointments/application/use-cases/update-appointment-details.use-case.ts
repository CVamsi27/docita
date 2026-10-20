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
import { buildAppointmentObservationMetrics } from '@/domains/appointments/core/domain-services/appointment-observation-metrics.rules';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

// AuditLogged: appointment detail updates (AppointmentCommandService)

type AppointmentForUpdate = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatusEnum;
};

interface UpdateAppointmentDetailsCommand {
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

    const prismaPatch = toPrismaAppointmentUpdate(data);

    // Nothing to write (autosave from an empty draft, or a no-op PATCH).
    // Bailing here avoids the "0 rows updated" → 404 noise that otherwise
    // surfaces when a consultation opens without any draft content yet.
    if (Object.keys(prismaPatch).length === 0) {
      return;
    }

    await this.assertNoScheduleConflict(
      command,
      appointment,
      appointmentId,
      clinicId,
    );

    const count = await this.writeRepository.applyPatch(
      appointmentId,
      clinicId,
      prismaPatch,
      // Only a status-carrying patch is guarded; clinical edits stay
      // unconditional so post-completion notes still save (ADR 0013 §C2.1).
      prismaPatch.status === undefined ? undefined : appointment.status,
    );
    if (count === 0) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    if (data.status === 'completed') {
      this.eventEmitter.emit(ApplicationEvents.APPOINTMENT_COMPLETED, {
        // allow-direct-emit: post-commit fan-out to billing/metrics. Listeners are idempotent. Outbox migration deferred (ADR 0010 §Follow-up).
        appointmentId,
        clinicId,
      });
    }

    await this.recordObservationMetrics(data, command, appointmentId, clinicId);
  }

  private async assertNoScheduleConflict(
    command: UpdateAppointmentDetailsCommand,
    appointment: AppointmentForUpdate,
    appointmentId: string,
    clinicId: string,
  ): Promise<void> {
    const { data } = command;
    const nextDoctorId =
      typeof data.doctorId === 'string' && data.doctorId.trim() !== ''
        ? data.doctorId
        : appointment.doctorId;
    // A doctor reassignment must be conflict-checked too: moving an appointment
    // onto a doctor already booked for that slot is a double-booking even when
    // the times are untouched.
    const touchesSchedule =
      data.startTime !== undefined ||
      data.endTime !== undefined ||
      nextDoctorId !== appointment.doctorId;
    if (!touchesSchedule) return;

    const nextStart = coerceAppointmentDate(
      data.startTime,
      appointment.startTime,
    );
    const nextEnd = coerceAppointmentDate(data.endTime, appointment.endTime);
    const overlap = await this.schedulingRules.validateAppointmentOverlap(
      nextDoctorId,
      clinicId,
      nextStart,
      nextEnd,
      appointmentId,
    );
    if (overlap.hasConflict)
      throw new BadRequestException('Doctor has conflicting appointment');
  }

  private async recordObservationMetrics(
    data: Partial<UpdateAppointmentRequest>,
    command: UpdateAppointmentDetailsCommand,
    appointmentId: string,
    clinicId: string,
  ): Promise<void> {
    const metrics = buildAppointmentObservationMetrics(data);
    if (metrics.length === 0) return;

    this.logger.log({
      action: 'appointment.details.update',
      appointmentId,
      clinicId,
      metricCount: metrics.length,
    });

    await this.metricsService.recordObservationMetrics({
      clinicId,
      patientId: command.appointment.patientId,
      appointmentId,
      metrics,
    });
  }
}
