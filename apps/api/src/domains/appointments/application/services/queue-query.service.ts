import { Injectable, Inject } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import {
  IQueueRepository,
  QUEUE_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import {
  calcAvgConsultationMinutes,
  getTodayRange,
  mapQueueToken,
} from './queue-token.helpers';

@Injectable()
export class QueueQueryService {
  constructor(
    @Inject(QUEUE_REPOSITORY_TOKEN)
    private readonly queueRepository: IQueueRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getQueue(clinicId: string, doctorId?: string, search?: string) {
    const { today, tomorrow } = getTodayRange(this.clock);

    const tokens = await this.queueRepository.findTodayTokens(
      clinicId,
      today,
      tomorrow,
      doctorId,
      ['WAITING', 'IN_PROGRESS'],
      search,
    );

    return tokens.map(mapQueueToken);
  }

  async getTodayQueue(clinicId: string, doctorId?: string, search?: string) {
    const { today, tomorrow } = getTodayRange(this.clock);

    const tokens = await this.queueRepository.findTodayTokens(
      clinicId,
      today,
      tomorrow,
      doctorId,
      undefined,
      search,
    );

    const patients = tokens.map((t) => ({
      id: t.id,
      type: t.appointmentId
        ? 'appointment'
        : ('queue' as 'appointment' | 'queue'),
      tokenNumber: t.tokenNumber,
      tokenType: t.tokenType as
        | 'scheduled'
        | 'walk-in'
        | 'late-arrival'
        | 'pending',
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
    }));

    const stats = {
      total: tokens.length,
      pending: tokens.filter((t) => t.status === 'WAITING').length,
      waiting: tokens.filter((t) => t.status === 'WAITING').length,
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
}
