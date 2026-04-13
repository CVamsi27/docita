import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ILeaveRepository,
  StaffLeaveWithRelations,
} from '@/domains/leave/core/repositories/leave.repository.interface';
import { StaffLeave, LeavePlan, Prisma } from '@workspace/db';

const staffInclude = {
  staff: { select: { id: true, name: true, email: true, role: true } },
  approver: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaLeaveRepository implements ILeaveRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async createLeave(
    data: Prisma.StaffLeaveCreateInput,
  ): Promise<StaffLeaveWithRelations> {
    return this.prisma.staffLeave.create({ data, include: staffInclude });
  }

  async findLeaveById(id: string): Promise<StaffLeave | null> {
    return this.getReadClient().staffLeave.findUnique({ where: { id } });
  }

  async findLeaveWithStaff(
    id: string,
  ): Promise<StaffLeaveWithRelations | null> {
    return this.getReadClient().staffLeave.findUnique({
      where: { id },
      include: staffInclude,
    });
  }

  async updateLeave(
    id: string,
    data: Prisma.StaffLeaveUpdateInput,
  ): Promise<StaffLeaveWithRelations> {
    return this.prisma.staffLeave.update({
      where: { id },
      data,
      include: staffInclude,
    });
  }

  async findLeaves(
    where: Prisma.StaffLeaveWhereInput,
    orderBy: Prisma.StaffLeaveOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<StaffLeaveWithRelations[]> {
    return this.getReadClient().staffLeave.findMany({
      where,
      orderBy,
      include: staffInclude,
    });
  }

  async findTimeOffsForLeave(
    staffId: string,
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ id: string }>> {
    return this.getReadClient().doctorTimeOff.findMany({
      where: { doctorId: staffId, clinicId, startDate, endDate },
      select: { id: true },
    });
  }

  async createLeavePlan(data: Prisma.LeavePlanCreateInput): Promise<LeavePlan> {
    return this.prisma.leavePlan.create({ data });
  }

  async upsertLeavePlan(
    where: Prisma.LeavePlanWhereUniqueInput,
    create: Prisma.LeavePlanCreateInput,
    update: Prisma.LeavePlanUpdateInput,
  ): Promise<LeavePlan> {
    return this.prisma.leavePlan.upsert({ where, create, update });
  }

  async findLeavePlanById(id: string): Promise<LeavePlan | null> {
    return this.getReadClient().leavePlan.findUnique({ where: { id } });
  }

  async updateLeavePlan(
    id: string,
    data: Prisma.LeavePlanUpdateInput,
  ): Promise<LeavePlan> {
    return this.prisma.leavePlan.update({ where: { id }, data });
  }

  async findLeavePlans(
    where: Prisma.LeavePlanWhereInput,
    orderBy: Prisma.LeavePlanOrderByWithRelationInput = { leaveType: 'asc' },
  ): Promise<LeavePlan[]> {
    return this.getReadClient().leavePlan.findMany({ where, orderBy });
  }
}
