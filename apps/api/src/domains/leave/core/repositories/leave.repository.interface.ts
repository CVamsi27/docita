import { StaffLeave, LeavePlan, Prisma, User } from '@workspace/db';

export type StaffLeaveWithRelations = StaffLeave & {
  staff?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  approver?: Pick<User, 'id' | 'name'> | null;
};

export interface ILeaveRepository {
  createLeave(
    data: Prisma.StaffLeaveCreateInput,
  ): Promise<StaffLeaveWithRelations>;

  findLeaveById(id: string): Promise<StaffLeave | null>;

  findLeaveWithStaff(id: string): Promise<StaffLeaveWithRelations | null>;

  updateLeave(
    id: string,
    data: Prisma.StaffLeaveUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<StaffLeaveWithRelations>;

  findLeaves(
    where: Prisma.StaffLeaveWhereInput,
    orderBy?: Prisma.StaffLeaveOrderByWithRelationInput,
  ): Promise<StaffLeaveWithRelations[]>;

  findTimeOffsForLeave(
    staffId: string,
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ id: string }>>;

  createLeavePlan(data: Prisma.LeavePlanCreateInput): Promise<LeavePlan>;

  upsertLeavePlan(
    where: Prisma.LeavePlanWhereUniqueInput,
    create: Prisma.LeavePlanCreateInput,
    update: Prisma.LeavePlanUpdateInput,
  ): Promise<LeavePlan>;

  findLeavePlanById(id: string): Promise<LeavePlan | null>;

  updateLeavePlan(
    id: string,
    data: Prisma.LeavePlanUpdateInput,
  ): Promise<LeavePlan>;

  findLeavePlans(
    where: Prisma.LeavePlanWhereInput,
    orderBy?: Prisma.LeavePlanOrderByWithRelationInput,
  ): Promise<LeavePlan[]>;
}

export const LEAVE_REPOSITORY_TOKEN = Symbol('ILeaveRepository');
