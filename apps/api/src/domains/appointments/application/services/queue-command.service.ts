import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { QueueToken, QueueTokenStatus } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  IQueueRepository,
  QUEUE_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import { AppointmentQueryService } from './appointment-query.service';
import { getTodayRange } from './queue-token.helpers';

/** Statuses a token can still be moved out of; anything else is finished. */
const ACTIVE_TOKEN_STATUSES = [
  QueueTokenStatus.WAITING,
  QueueTokenStatus.IN_PROGRESS,
] as const;

@Injectable()
export class QueueCommandService {
  private static isUniqueViolation(error: unknown): boolean {
    return isRecord(error) && error.code === 'P2002';
  }

  constructor(
    @Inject(QUEUE_REPOSITORY_TOKEN)
    private readonly queueRepository: IQueueRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly appointmentQueryService: AppointmentQueryService,
  ) {}

  private async resolveTodayRange(clinicId: string) {
    const timezone =
      await this.appointmentQueryService.getClinicTimezone(clinicId);
    return getTodayRange(this.clock, timezone);
  }

  async checkIn(clinicId: string, appointmentId: string) {
    const appointment = await this.queueRepository.findAppointmentForCheckIn(
      appointmentId,
      clinicId,
    );

    if (!appointment) throw new NotFoundException('Appointment not found');

    const existing = await this.queueRepository.findExistingToken(
      appointmentId,
      clinicId,
    );
    if (existing) {
      return { success: true, token: existing };
    }

    const { today } = await this.resolveTodayRange(clinicId);

    // Allocation is atomic (advisory lock + unique (clinicId, tokenDay,
    // tokenNumber)), so parallel check-ins for different appointments cannot
    // both claim the same number.
    let token: QueueToken;
    try {
      token = await this.queueRepository.allocateToken(
        {
          clinicId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          doctorId: appointment.doctorId ?? null,
          tokenType: 'scheduled',
          scheduledTime: appointment.startTime,
          estimatedDuration: 15,
          status: QueueTokenStatus.WAITING,
        },
        today,
      );
    } catch (error) {
      // Two concurrent check-ins for the SAME appointment both see no existing
      // token above, but only one can insert (appointmentId is unique). The
      // loser re-reads and returns that token, so check-in stays idempotent
      // instead of surfacing a unique-violation error.
      if (QueueCommandService.isUniqueViolation(error)) {
        const concurrent = await this.queueRepository.findExistingToken(
          appointment.id,
          clinicId,
        );
        if (concurrent) return { success: true, token: concurrent };
      }
      throw error;
    }

    return { success: true, token };
  }

  async callPatient(clinicId: string, queueId: string) {
    const existing = await this.getTokenOrThrow(queueId, clinicId);
    if (existing.status === QueueTokenStatus.IN_PROGRESS) return existing;

    return this.advanceToken(queueId, QueueTokenStatus.IN_PROGRESS, {
      calledAt: this.clock.now(),
      consultationStart: this.clock.now(),
    });
  }

  async completePatient(clinicId: string, queueId: string) {
    const existing = await this.getTokenOrThrow(queueId, clinicId);
    if (existing.status === QueueTokenStatus.COMPLETED) return existing;

    return this.advanceToken(queueId, QueueTokenStatus.COMPLETED, {
      completedAt: this.clock.now(),
    });
  }

  /**
   * Move a token forward only while it is still active. A "call" that was in
   * flight when the visit finished loses the race instead of reopening it.
   */
  private async advanceToken(
    queueId: string,
    status: QueueTokenStatus,
    data: { calledAt?: Date; consultationStart?: Date; completedAt?: Date },
  ): Promise<QueueToken> {
    const updated = await this.queueRepository.transitionTokenStatus(
      queueId,
      [...ACTIVE_TOKEN_STATUSES],
      { ...data, status },
    );
    if (!updated) {
      throw new ConflictException(
        'This queue entry is no longer active and cannot be reopened',
      );
    }
    return updated;
  }

  async resetQueue(clinicId: string) {
    const { today } = await this.resolveTodayRange(clinicId);
    await this.queueRepository.cancelTodayActiveTokens(clinicId, today);
    return { success: true };
  }

  private async getTokenOrThrow(queueId: string, clinicId: string) {
    const token = await this.queueRepository.findTokenByIdAndClinic(
      queueId,
      clinicId,
    );
    if (!token) throw new NotFoundException('Queue token not found');
    return token;
  }
}
