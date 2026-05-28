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
import { Role } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  TRANSACTION_RUNNER_PORT,
  type ITransactionRunner,
} from '@/shared/common/ports/transaction-runner.port';
import { parseLeaveType } from './leave-type.helpers';

@Injectable()
export class LeaveCommandService {
  private readonly logger = new Logger(LeaveCommandService.name);

  constructor(
    @Inject(LEAVE_REPOSITORY_TOKEN)
    private readonly leaveRepository: ILeaveRepository,
    private readonly availabilityScheduleService: AvailabilityScheduleService,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: ITransactionRunner,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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

    const leaveType = parseLeaveType(data.leaveType);
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
    // Block self-approval: an admin who is also the leave's owner cannot
    // approve their own request.
    if (leave.staffId === approverId) {
      throw new ForbiddenException('You cannot approve your own leave');
    }
    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve a leave in ${leave.status} status`,
      );
    }

    const staffRole = leave.staff?.role;
    const isDoctor =
      staffRole === Role.DOCTOR || staffRole === Role.ADMIN_DOCTOR;

    // Both writes participate in a single Prisma transaction; a failure in
    // either rolls back the other atomically. Status is re-checked inside
    // the transaction to close the TOCTOU window between the initial
    // PENDING check above and the write below.
    const updated = await this.transactionRunner.runInTransaction(
      async (tx) => {
        const current = await this.leaveRepository.findLeaveById(leaveId);
        if (!current || current.status !== 'PENDING') {
          throw new BadRequestException(
            `Cannot approve a leave in ${current?.status ?? 'UNKNOWN'} status`,
          );
        }

        if (isDoctor) {
          await this.availabilityScheduleService.createTimeOff(
            {
              doctorId: leave.staffId,
              clinicId: leave.clinicId,
              startDate: leave.startDate,
              endDate: leave.endDate,
              reason: `Leave: ${leave.reason ?? leave.leaveType}`,
              isFullDay: true,
            },
            tx,
          );
        }

        return this.leaveRepository.updateLeave(
          leaveId,
          {
            status: 'APPROVED',
            approver: { connect: { id: approverId } },
            approvedAt: this.clock.now(),
          },
          tx,
        );
      },
    );

    this.logger.log('Leave approved', {
      leaveId,
      approverId,
      staffId: leave.staffId,
      clinicId: leave.clinicId,
      previousStatus: 'PENDING',
      newStatus: 'APPROVED',
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
    });
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
    if (leave.staffId === approverId) {
      throw new ForbiddenException('You cannot reject your own leave');
    }
    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject a leave in ${leave.status} status`,
      );
    }

    const updated = await this.transactionRunner.runInTransaction(
      async (tx) => {
        const current = await this.leaveRepository.findLeaveById(leaveId);
        if (!current || current.status !== 'PENDING') {
          throw new BadRequestException(
            `Cannot reject a leave in ${current?.status ?? 'UNKNOWN'} status`,
          );
        }
        return this.leaveRepository.updateLeave(
          leaveId,
          {
            status: 'REJECTED',
            approver: { connect: { id: approverId } },
            approvedAt: this.clock.now(),
            rejectionReason,
          },
          tx,
        );
      },
    );

    this.logger.log('Leave rejected', {
      leaveId,
      approverId,
      staffId: leave.staffId,
      clinicId: leave.clinicId,
      previousStatus: 'PENDING',
      newStatus: 'REJECTED',
      rejectionReason,
    });
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
      cancelledAt: this.clock.now(),
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
}
