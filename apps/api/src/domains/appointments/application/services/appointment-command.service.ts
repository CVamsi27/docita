import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentReadRepository,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Role, VitalSign } from '@workspace/db';
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
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentQueryService } from './appointment-query.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

/** Handles all write operations for appointments (create, update, cancel, reschedule). */
@Injectable()
export class AppointmentCommandService {
  constructor(
    private readonly queryService: AppointmentQueryService,
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    private readonly readRepository: IAppointmentReadRepository,
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepository: IAppointmentWriteRepository,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    private readonly startConsultationUseCase: StartConsultationUseCase,
    private readonly updateAppointmentDetailsUseCase: UpdateAppointmentDetailsUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: AppointmentMetricsService,
    private readonly diagnosisService: AppointmentDiagnosisService,
  ) {}

  async createAppointment(
    command: CreateAppointmentCommand,
  ): Promise<Appointment> {
    const appointment = await this.createAppointmentUseCase.execute(command);

    this.eventEmitter.emit(
      ApplicationEvents.APPOINTMENT_CREATED,
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
    if (!accessContext?.userId || !accessContext.role) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    return this.startConsultationUseCase.execute({
      appointmentId: id,
      clinicId,
      userId: accessContext.userId,
      role: accessContext.role,
    });
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
    return this.cancelAppointmentUseCase.execute({ appointment, reason });
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
    await this.rescheduleAppointmentUseCase.execute({
      appointment,
      clinicId,
      startTime,
      endTime,
    });
  }

  async updateAppointmentDetails(
    id: string,
    clinicId: string,
    data: Partial<UpdateAppointmentRequest>,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.readRepository.findForUpdate(id, clinicId);

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

    await this.updateAppointmentDetailsUseCase.execute({
      appointmentId: id,
      clinicId,
      data,
      appointment,
    });

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
