import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FollowUpStatus, Prisma } from '@workspace/db';
import {
  IFollowUpRepository,
  FollowUpWithRelations,
} from '@/domains/appointments/core/repositories/follow-up.repository.interface';

@Injectable()
export class PrismaFollowUpRepository implements IFollowUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(data: Prisma.FollowUpUncheckedCreateInput) {
    return this.prisma.followUp.create({ data });
  }

  async findForClinic(params: {
    clinicId: string;
    statuses?: FollowUpStatus[];
    from?: Date;
    to?: Date;
    take: number;
  }): Promise<FollowUpWithRelations[]> {
    const where: Prisma.FollowUpWhereInput = {
      clinicId: params.clinicId,
    };
    if (params.statuses?.length) {
      where.status = { in: params.statuses };
    }
    if (params.from || params.to) {
      where.scheduledDate = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    const rows = await this.getReadClient().followUp.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: params.take,
    });
    return rows satisfies FollowUpWithRelations[];
  }

  async findUpcoming(
    clinicId: string,
    from: Date,
    to: Date,
  ): Promise<FollowUpWithRelations[]> {
    const rows = await this.getReadClient().followUp.findMany({
      where: {
        clinicId,
        status: { in: ['PENDING', 'REMINDER_SENT'] },
        scheduledDate: { gte: from, lte: to },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 50,
    });
    return rows satisfies FollowUpWithRelations[];
  }

  async findForAppointment(appointmentId: string, clinicId: string) {
    const rows = await this.getReadClient().followUp.findMany({
      where: { appointmentId, clinicId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows satisfies FollowUpWithRelations[];
  }

  async findByIdAndClinic(id: string, clinicId: string) {
    return this.getReadClient().followUp.findFirst({ where: { id, clinicId } });
  }

  async update(id: string, data: Prisma.FollowUpUpdateInput) {
    return this.prisma.followUp.update({ where: { id }, data });
  }
}
