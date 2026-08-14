// jscpd:ignore-start
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { DoctorDelayMarkedEvent } from '@/domains/appointments/application/events/doctor-delay-marked.event';
import {
  DOCTOR_DELAY_REPOSITORY_TOKEN,
  type IDoctorDelayRepository,
} from '@/domains/appointments/application/ports/doctor-delay.repository.port';

interface MarkDoctorDelayCommand {
  clinicId: string;
  doctorId: string;
  delayMinutes: number;
  reason?: string;
  markedById: string;
}

interface DoctorDelayResponse {
  id: string;
  clinicId: string;
  doctorId: string;
  delayMinutes: number;
  reason?: string | null;
  isActive: boolean;
  markedById: string;
  markedAt: Date;
  clearedAt?: Date | null;
  clearedById?: string | null;
  affectedAppointmentCount: number;
  // jscpd:ignore-end
}

/** Facade — doctor delay mark/clear; delegates to IDoctorDelayRepository. */
@Injectable()
export class DoctorDelayService {
  private readonly logger = new Logger(DoctorDelayService.name);

  constructor(
    @Inject(DOCTOR_DELAY_REPOSITORY_TOKEN)
    private readonly doctorDelayRepository: IDoctorDelayRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async markDelay(
    command: MarkDoctorDelayCommand,
  ): Promise<DoctorDelayResponse> {
    if (command.delayMinutes < 1 || command.delayMinutes > 480)
      throw new BadRequestException('Delay must be between 1 and 480 minutes');

    const { delay, affectedAppointmentIds } =
      await this.doctorDelayRepository.markDelayAndShiftAppointments(command);

    this.logger.log(
      `Doctor delay marked: ${delay.id} — ${command.delayMinutes}min for doctor ${command.doctorId}, affects ${affectedAppointmentIds.length} appointments`,
    );

    this.eventEmitter.emit(
      // allow-direct-emit: post-commit fan-out for patient delay notifications; repository above is already a single atomic write. Outbox migration is the next workstream (ADR 0010 §Follow-up).
      ApplicationEvents.DOCTOR_DELAY_MARKED,
      new DoctorDelayMarkedEvent(
        delay.id,
        command.clinicId,
        command.doctorId,
        command.delayMinutes,
        command.reason,
        affectedAppointmentIds,
      ),
    );

    return {
      ...delay,
      affectedAppointmentCount: affectedAppointmentIds.length,
    };
  }

  async clearDelay(
    delayId: string,
    clinicId: string,
    clearedById: string,
  ): Promise<void> {
    const delay = await this.doctorDelayRepository.findById(delayId);
    if (!delay || delay.clinicId !== clinicId)
      throw new NotFoundException('Delay not found');
    if (!delay.isActive)
      throw new BadRequestException('Delay is already cleared');

    await this.doctorDelayRepository.clearDelay(delayId, clinicId, clearedById);

    this.logger.log(`Doctor delay cleared: ${delayId} by ${clearedById}`);
  }

  async getActiveDelay(
    doctorId: string,
    clinicId: string,
  ): Promise<DoctorDelayResponse | null> {
    const delay = await this.doctorDelayRepository.findActiveByDoctor(
      doctorId,
      clinicId,
    );
    if (!delay) return null;
    return { ...delay, affectedAppointmentCount: 0 };
  }

  async getActiveDelaysForClinic(
    clinicId: string,
  ): Promise<DoctorDelayResponse[]> {
    const delays =
      await this.doctorDelayRepository.findActiveByClinic(clinicId);
    return delays.map((d) => ({ ...d, affectedAppointmentCount: 0 }));
  }
}
