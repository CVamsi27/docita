import { Injectable, Inject } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import type { ListFollowUpsQuery } from '@workspace/types';
import {
  IFollowUpRepository,
  FOLLOW_UP_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/follow-up.repository.interface';
import {
  parseFollowUpDate,
  parseFollowUpStatuses,
} from './follow-up.helpers';

@Injectable()
export class FollowUpQueryService {
  constructor(
    @Inject(FOLLOW_UP_REPOSITORY_TOKEN)
    private readonly followUpRepository: IFollowUpRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async findUpcoming(clinicId: string) {
    const now = this.clock.now();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.followUpRepository.findUpcoming(clinicId, now, thirtyDays);
  }

  async findForClinic(clinicId: string, query: ListFollowUpsQuery = {}) {
    const now = this.clock.now();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.followUpRepository.findForClinic({
      clinicId,
      statuses: parseFollowUpStatuses(query.status),
      from: query.from ? parseFollowUpDate(query.from) : now,
      to: query.to ? parseFollowUpDate(query.to) : thirtyDays,
      take: query.limit ?? 50,
    });
  }

  async findForAppointment(appointmentId: string, clinicId: string) {
    return this.followUpRepository.findForAppointment(appointmentId, clinicId);
  }
}
