import { Injectable, Inject } from '@nestjs/common';
import {
  ILeaveRepository,
  LEAVE_REPOSITORY_TOKEN,
} from '@/domains/leave/core/repositories/leave.repository.interface';
import { LeaveMapper } from '@/domains/leave/infrastructure/mappers/leave.mapper';
import { Prisma } from '@workspace/db';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { parseLeaveStatus } from './leave-type.helpers';

@Injectable()
export class LeaveQueryService {
  constructor(
    @Inject(LEAVE_REPOSITORY_TOKEN)
    private readonly leaveRepository: ILeaveRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getLeaves(
    clinicId: string,
    filters: {
      staffId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: Prisma.StaffLeaveWhereInput = { clinicId };
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.status) where.status = parseLeaveStatus(filters.status);
    if (filters.startDate || filters.endDate) {
      where.startDate = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    const leaves = await this.leaveRepository.findLeaves(where);
    return leaves.map((l) => LeaveMapper.staffLeaveToDomain(l));
  }

  async getLeaveBalance(staffId: string, clinicId: string) {
    const year = this.clock.now().getFullYear();
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

    const [plans, leaves] = await Promise.all([
      this.leaveRepository.findLeavePlans({ clinicId, isActive: true }),
      this.leaveRepository.findLeaves({
        staffId,
        clinicId,
        startDate: { gte: yearStart, lte: yearEnd },
        status: { in: ['PENDING', 'APPROVED'] },
      }),
    ]);

    const leaveTypes = [
      'CASUAL',
      'SICK',
      'EARNED',
      'COMP_OFF',
      'UNPAID',
      'HOLIDAY',
    ] as const;

    return leaveTypes.map((lt) => {
      const plan = plans.find((p) => p.leaveType === lt);
      const annualQuota = plan?.annualQuota ?? 0;
      const typeLeaves = leaves.filter((l) => l.leaveType === lt);
      const approved = typeLeaves.filter((l) => l.status === 'APPROVED');
      const pending = typeLeaves.filter((l) => l.status === 'PENDING');

      const daysUsed = approved.reduce((acc, l) => {
        const diff =
          Math.ceil(
            (l.endDate.getTime() - l.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        return acc + diff;
      }, 0);

      const daysPending = pending.reduce((acc, l) => {
        const diff =
          Math.ceil(
            (l.endDate.getTime() - l.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        return acc + diff;
      }, 0);

      return {
        leaveType: lt,
        annualQuota,
        used: daysUsed,
        remaining: Math.max(0, annualQuota - daysUsed),
        pending: daysPending,
      };
    });
  }
}
