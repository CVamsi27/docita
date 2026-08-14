import { Injectable, Inject } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  IQueueRepository,
  QUEUE_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import { AppointmentQueryService } from './appointment-query.service';
import {
  calcAvgConsultationMinutes,
  getTodayRange,
  mapQueueToken,
  parseQueueTokenType,
} from './queue-token.helpers';

@Injectable()
export class QueueQueryService {
  constructor(
    @Inject(QUEUE_REPOSITORY_TOKEN)
    private readonly queueRepository: IQueueRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly appointmentQueryService: AppointmentQueryService,
  ) {}

  async getQueue(clinicId: string, doctorId?: string, search?: string) {
    const tokens = await this.fetchTodayTokens(
      clinicId,
      doctorId,
      ['WAITING', 'IN_PROGRESS'],
      search,
    );

    return tokens.map(mapQueueToken);
  }

  async getTodayQueue(clinicId: string, doctorId?: string, search?: string) {
    const tokens = await this.fetchTodayTokens(
      clinicId,
      doctorId,
      undefined,
      search,
    );

    const patients = tokens.map((t) => {
      const type = (t.appointmentId ? 'appointment' : 'queue') satisfies
        | 'appointment'
        | 'queue';
      return {
        id: t.id,
        type,
        tokenNumber: t.tokenNumber,
        tokenType: parseQueueTokenType(t.tokenType),
        status: t.status,
        priority: t.priority,
        scheduledTime: t.scheduledTime?.toISOString() ?? null,
        checkInTime: t.createdAt.toISOString(),
        patient: {
          id: t.patient.id,
          firstName: t.patient.firstName,
          lastName: t.patient.lastName,
          phoneNumber: t.patient.phoneNumber ?? null,
          gender: t.patient.gender ?? null,
          dateOfBirth: t.patient.dateOfBirth?.toISOString() ?? null,
        },
        doctor: t.doctor ?? null,
        appointmentId: t.appointmentId ?? null,
        appointmentType: t.appointment?.type ?? null,
        chiefComplaint: t.appointment?.chiefComplaint ?? null,
        estimatedWaitTime: t.estimatedWaitTime ?? null,
        calledAt: t.calledAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      };
    });

    const waitingCount = tokens.filter((t) => t.status === 'WAITING').length;
    const stats = {
      total: tokens.length,
      pending: waitingCount,
      waiting: waitingCount,
      inProgress: tokens.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tokens.filter((t) => t.status === 'COMPLETED').length,
      noShow: 0,
      walkIns: tokens.filter((t) => t.tokenType === 'walk-in').length,
      scheduled: tokens.filter((t) => t.tokenType === 'scheduled').length,
      avgConsultationMinutes: calcAvgConsultationMinutes(
        tokens.filter((t) => t.consultationStart && t.completedAt),
      ),
    };

    return { patients, stats };
  }

  private async fetchTodayTokens(
    clinicId: string,
    doctorId?: string,
    status?: string[],
    search?: string,
  ) {
    const timezone =
      await this.appointmentQueryService.getClinicTimezone(clinicId);
    const { today, tomorrow } = getTodayRange(this.clock, timezone);
    return this.queueRepository.findTodayTokens(
      clinicId,
      today,
      tomorrow,
      doctorId,
      status,
      search,
    );
  }
}
