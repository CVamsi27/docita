import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { LeaveType } from '@workspace/db';
import {
  ILeaveRepository,
  LEAVE_REPOSITORY_TOKEN,
} from '@/domains/leave/core/repositories/leave.repository.interface';
import { LeaveMapper } from '@/domains/leave/infrastructure/mappers/leave.mapper';

@Injectable()
export class LeavePlanService {
  private readonly logger = new Logger(LeavePlanService.name);

  constructor(
    @Inject(LEAVE_REPOSITORY_TOKEN)
    private readonly leaveRepository: ILeaveRepository,
  ) {}

  private toLeaveType(rawType: string): LeaveType {
    if ((Object.values(LeaveType) as string[]).includes(rawType)) {
      return rawType as LeaveType;
    }
    throw new BadRequestException(`Unsupported leave type: ${rawType}`);
  }

  async getPlans(clinicId: string) {
    const plans = await this.leaveRepository.findLeavePlans({ clinicId });
    return plans.map((p) => LeaveMapper.leavePlanToDomain(p));
  }

  async createPlan(
    clinicId: string,
    data: {
      leaveType: string;
      annualQuota: number;
      carryForward?: boolean;
      maxCarryForward?: number;
      isActive?: boolean;
    },
  ) {
    const leaveType = this.toLeaveType(data.leaveType);
    const plan = await this.leaveRepository.upsertLeavePlan(
      { clinicId_leaveType: { clinicId, leaveType } },
      {
        clinic: { connect: { id: clinicId } },
        leaveType,
        annualQuota: data.annualQuota,
        carryForward: data.carryForward ?? false,
        maxCarryForward: data.maxCarryForward ?? 0,
        isActive: data.isActive ?? true,
      },
      {
        annualQuota: data.annualQuota,
        carryForward: data.carryForward ?? false,
        maxCarryForward: data.maxCarryForward ?? 0,
        isActive: data.isActive ?? true,
      },
    );

    this.logger.log('Leave plan upserted', {
      clinicId,
      leaveType: data.leaveType,
    });
    return LeaveMapper.leavePlanToDomain(plan);
  }

  async updatePlan(
    id: string,
    clinicId: string,
    data: {
      annualQuota?: number;
      carryForward?: boolean;
      maxCarryForward?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.leaveRepository.findLeavePlanById(id);
    if (!existing || existing.clinicId !== clinicId) {
      throw new NotFoundException('Leave plan not found');
    }

    const updated = await this.leaveRepository.updateLeavePlan(id, data);

    this.logger.log('Leave plan updated', { id, clinicId });
    return LeaveMapper.leavePlanToDomain(updated);
  }
}
