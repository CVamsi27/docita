import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
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

  async findUpcoming(
    clinicId: string,
    from: Date,
    to: Date,
  ): Promise<FollowUpWithRelations[]> {
    return this.getReadClient().followUp.findMany({
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
    }) as Promise<FollowUpWithRelations[]>;
  }

  async findForAppointment(appointmentId: string, clinicId: string) {
    return this.getReadClient().followUp.findMany({
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
    }) as Promise<FollowUpWithRelations[]>;
  }

  async findByIdAndClinic(id: string, clinicId: string) {
    return this.getReadClient().followUp.findFirst({ where: { id, clinicId } });
  }

  async update(id: string, data: Prisma.FollowUpUpdateInput) {
    return this.prisma.followUp.update({ where: { id }, data });
  }
}
