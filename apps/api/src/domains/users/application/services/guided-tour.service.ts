import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GuidedTourStatus } from '@workspace/db';
import type { UpdateGuidedTourRequest } from '@workspace/types';
import {
  GuidedTourStateRecord,
  GuidedTourUpdate,
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Thin facade — delegates guided-tour reads/writes to IUserRepository and
 * stamps terminal-state / dismissal timestamps via the injected clock port.
 */
@Injectable()
export class GuidedTourService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly repository: IUserRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getGuidedTour(userId: string): Promise<GuidedTourStateRecord> {
    const state = await this.repository.getGuidedTour(userId);
    if (!state) throw new BadRequestException('User not found');
    return state;
  }

  async updateGuidedTour(
    userId: string,
    data: UpdateGuidedTourRequest,
  ): Promise<GuidedTourStateRecord> {
    const patch: GuidedTourUpdate = {};

    if (data.status !== undefined) {
      const status: GuidedTourStatus = data.status;
      patch.status = status;
      // COMPLETED/SKIPPED are terminal — record when the tour ended so the
      // client auto-start gate never fires again for this user.
      if (status === 'COMPLETED' || status === 'SKIPPED') {
        patch.completedAt = this.clock.now();
      }
    }
    if (data.lastStep !== undefined) {
      patch.lastStep = data.lastStep;
    }
    if (data.checklistDismissed !== undefined) {
      patch.checklistDismissedAt = data.checklistDismissed
        ? this.clock.now()
        : null;
    }

    return this.repository.updateGuidedTour(userId, patch);
  }
}
