import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
  APPOINTMENT_WRITE_REPOSITORY_TOKEN,
  IAppointmentReadRepository,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { isFrontDeskPlanMode } from '@workspace/types';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

interface StartConsultationCommand {
  appointmentId: string;
  clinicId: string;
  userId: string;
  role: Role;
}

const CONSULTATION_START_ALLOWED_STATUSES = new Set<AppointmentStatusEnum>([
  AppointmentStatusEnum.SCHEDULED,
  AppointmentStatusEnum.CONFIRMED,
  AppointmentStatusEnum.ARRIVED,
  AppointmentStatusEnum.IN_PROGRESS,
]);

@Injectable()
export class StartConsultationUseCase {
  private readonly logger = new Logger(StartConsultationUseCase.name);

  constructor(
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    private readonly readRepository: IAppointmentReadRepository,
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepository: IAppointmentWriteRepository,
  ) {}

  async execute(
    command: StartConsultationCommand,
  ): Promise<{ appointmentId: string; status: string }> {
    const { appointmentId, clinicId, userId, role } = command;

    const clinicRow = await this.readRepository.findClinicTier(clinicId);
    if (
      clinicRow &&
      isFrontDeskPlanMode(clinicRow.tier, clinicRow.planMode ?? undefined)
    ) {
      throw new ForbiddenException(
        'Consultation start is not available on the Front Desk plan.',
      );
    }

    if (role !== Role.DOCTOR && role !== Role.ADMIN_DOCTOR) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    const appointment = await this.readRepository.findForConsultationStart(
      appointmentId,
      clinicId,
    );

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    if (appointment.doctorId !== userId) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    if (!CONSULTATION_START_ALLOWED_STATUSES.has(appointment.status)) {
      throw new BadRequestException(
        'This consultation cannot be started from its current appointment status',
      );
    }

    this.logger.log({
      action: 'appointment.consultation.start',
      appointmentId,
      clinicId,
    });

    try {
      await this.writeRepository.startConsultationTx(
        appointmentId,
        clinicId,
        appointment.queueToken,
        appointment.status,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === `Appointment with ID ${appointmentId} not found`
      ) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }

    return { appointmentId: appointment.id, status: 'in-progress' };
  }
}
