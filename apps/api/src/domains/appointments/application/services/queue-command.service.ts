import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  IQueueRepository,
  QUEUE_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import { getTodayRange } from './queue-token.helpers';

@Injectable()
export class QueueCommandService {
  constructor(
    @Inject(QUEUE_REPOSITORY_TOKEN)
    private readonly queueRepository: IQueueRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async checkIn(clinicId: string, appointmentId: string) {
    const appointment = await this.queueRepository.findAppointmentForCheckIn(
      appointmentId,
      clinicId,
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const existing = await this.queueRepository.findExistingToken(
      appointmentId,
      clinicId,
    );
    if (existing) {
      return { success: true, token: existing };
    }

    const { today } = getTodayRange(this.clock);
    const lastNumber = await this.queueRepository.findLastTodayTokenNumber(
      clinicId,
      today,
    );

    const token = await this.queueRepository.createToken({
      clinicId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId ?? null,
      tokenNumber: lastNumber + 1,
      tokenType: 'scheduled',
      scheduledTime: appointment.startTime,
      estimatedDuration: 15,
      status: 'WAITING',
    });

    return { success: true, token };
  }

  async callPatient(clinicId: string, queueId: string) {
    const token = await this.queueRepository.findTokenByIdAndClinic(
      queueId,
      clinicId,
    );
    if (!token) throw new NotFoundException('Queue token not found');

    return this.queueRepository.updateToken(queueId, {
      status: 'IN_PROGRESS',
      calledAt: this.clock.now(),
      consultationStart: this.clock.now(),
    });
  }

  async completePatient(clinicId: string, queueId: string) {
    const token = await this.queueRepository.findTokenByIdAndClinic(
      queueId,
      clinicId,
    );
    if (!token) throw new NotFoundException('Queue token not found');

    return this.queueRepository.updateToken(queueId, {
      status: 'COMPLETED',
      completedAt: this.clock.now(),
    });
  }

  async resetQueue(clinicId: string) {
    const { today } = getTodayRange(this.clock);
    await this.queueRepository.cancelTodayActiveTokens(clinicId, today);
    return { success: true };
  }
}
