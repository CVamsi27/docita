import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ILeaveRepository,
  LEAVE_REPOSITORY_TOKEN,
} from '@/domains/leave/core/repositories/leave.repository.interface';
import { LeaveMapper } from '@/domains/leave/infrastructure/mappers/leave.mapper';
import { AvailabilityScheduleService } from '@/domains/doctors/application/services/availability-schedule.service';
import { LeaveStatus, LeaveType, Prisma, Role } from '@workspace/db';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @Inject(LEAVE_REPOSITORY_TOKEN)
    private readonly leaveRepository: ILeaveRepository,
    private readonly availabilityScheduleService: AvailabilityScheduleService,
  ) {}

  private toLeaveType(rawType: string): LeaveType {
    if ((Object.values(LeaveType) as string[]).includes(rawType)) {
      return rawType as LeaveType;
    }
    throw new BadRequestException(`Unsupported leave type: ${rawType}`);
  }

  private toLeaveStatus(rawStatus: string): LeaveStatus {
    if ((Object.values(LeaveStatus) as string[]).includes(rawStatus)) {
      return rawStatus as LeaveStatus;
    }
    throw new BadRequestException(`Unsupported leave status: ${rawStatus}`);
  }

  async applyLeave(
    staffId: string,
    clinicId: string,
    data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
    },
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const leaveType = this.toLeaveType(data.leaveType);
    const leave = await this.leaveRepository.createLeave({
      staff: { connect: { id: staffId } },
      clinic: { connect: { id: clinicId } },
      leaveType,
      startDate: start,
      endDate: end,
      reason: data.reason,
    });

    this.logger.log('Leave applied', { leaveId: leave.id, staffId, clinicId });
    return LeaveMapper.staffLeaveToDomain(leave);
  }

  async approveLeave(leaveId: string, approverId: string, clinicId: string) {
    const leave = await this.leaveRepository.findLeaveWithStaff(leaveId);

    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.clinicId !== clinicId)
      throw new ForbiddenException('Access denied');
    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve a leave in ${leave.status} status`,
      );
    }

    const updated = await this.leaveRepository.updateLeave(leaveId, {
      status: 'APPROVED',
      approver: { connect: { id: approverId } },
      approvedAt: new Date(),
    });

    const staffRole = leave.staff?.role;
    const isDoctor =
      staffRole === Role.DOCTOR || staffRole === Role.ADMIN_DOCTOR;
    if (isDoctor) {
      try {
        await this.availabilityScheduleService.createTimeOff({
          doctorId: leave.staffId,
          clinicId: leave.clinicId,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: `Leave: ${leave.reason ?? leave.leaveType}`,
          isFullDay: true,
        });
      } catch (err) {
        this.logger.warn('Could not create DoctorTimeOff for approved leave', {
          leaveId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.log('Leave approved', { leaveId, approverId });
    return LeaveMapper.staffLeaveToDomain(updated);
  }

  async rejectLeave(
    leaveId: string,
    approverId: string,
    clinicId: string,
    rejectionReason: string,
  ) {
    const leave = await this.leaveRepository.findLeaveById(leaveId);

    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.clinicId !== clinicId)
      throw new ForbiddenException('Access denied');
    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject a leave in ${leave.status} status`,
      );
    }

    const updated = await this.leaveRepository.updateLeave(leaveId, {
      status: 'REJECTED',
      approver: { connect: { id: approverId } },
      approvedAt: new Date(),
      rejectionReason,
    });

    this.logger.log('Leave rejected', { leaveId, approverId });
    return LeaveMapper.staffLeaveToDomain(updated);
  }

  async cancelLeave(leaveId: string, staffId: string, clinicId: string) {
    const leave = await this.leaveRepository.findLeaveById(leaveId);

    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.staffId !== staffId)
      throw new ForbiddenException('You can only cancel your own leave');
    if (leave.clinicId !== clinicId)
      throw new ForbiddenException('Access denied');
    if (leave.status === 'REJECTED' || leave.status === 'CANCELLED') {
      throw new BadRequestException(`Leave is already ${leave.status}`);
    }

    const wasApproved = leave.status === 'APPROVED';

    const updated = await this.leaveRepository.updateLeave(leaveId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });

    if (wasApproved) {
      try {
        const timeOffs = await this.leaveRepository.findTimeOffsForLeave(
          leave.staffId,
          leave.clinicId,
          leave.startDate,
          leave.endDate,
        );
        for (const timeOff of timeOffs) {
          await this.availabilityScheduleService.deleteTimeOff(timeOff.id);
        }
      } catch (err) {
        this.logger.warn('Could not remove DoctorTimeOff for cancelled leave', {
          leaveId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.log('Leave cancelled', { leaveId, staffId });
    return LeaveMapper.staffLeaveToDomain(updated);
  }

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
    if (filters.status) where.status = this.toLeaveStatus(filters.status);
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
    const year = new Date().getFullYear();
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
