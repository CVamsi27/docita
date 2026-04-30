import { FollowUp, FollowUpStatus, Prisma } from '@workspace/db';

export type FollowUpWithRelations = FollowUp & {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  } | null;
  doctor?: { id: string; name: string } | null;
};

export interface IFollowUpRepository {
  create(data: Prisma.FollowUpUncheckedCreateInput): Promise<FollowUp>;

  findForClinic(params: {
    clinicId: string;
    statuses?: FollowUpStatus[];
    from?: Date;
    to?: Date;
    take: number;
  }): Promise<FollowUpWithRelations[]>;

  findUpcoming(
    clinicId: string,
    from: Date,
    to: Date,
  ): Promise<FollowUpWithRelations[]>;

  findForAppointment(
    appointmentId: string,
    clinicId: string,
  ): Promise<FollowUpWithRelations[]>;

  findByIdAndClinic(id: string, clinicId: string): Promise<FollowUp | null>;

  update(id: string, data: Prisma.FollowUpUpdateInput): Promise<FollowUp>;
}

export const FOLLOW_UP_REPOSITORY_TOKEN = Symbol('IFollowUpRepository');
