import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IDoctorTimeOffRepository } from '@/domains/doctors/core/repositories/doctor-time-off.repository.interface';
import { Prisma } from '@workspace/db';

@Injectable()
export class PrismaDoctorTimeOffRepository implements IDoctorTimeOffRepository {
  constructor(private prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findTimeOffs(where: Prisma.DoctorTimeOffWhereInput) {
    return this.getReadClient().doctorTimeOff.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        clinic: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findTimeOffsForSlots(where: Prisma.DoctorTimeOffWhereInput) {
    return this.getReadClient().doctorTimeOff.findMany({
      where,
    });
  }

  async findDoctorIdsWithFullDayTimeOffOverlappingRange(
    clinicId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<string[]> {
    const rows = await this.getReadClient().doctorTimeOff.findMany({
      where: {
        isFullDay: true,
        AND: [
          { startDate: { lte: rangeEnd } },
          { endDate: { gte: rangeStart } },
        ],
        OR: [{ clinicId }, { clinicId: null }],
      },
      select: { doctorId: true },
    });
    return [...new Set(rows.map((r) => r.doctorId))];
  }

  async createTimeOff(
    data: Prisma.DoctorTimeOffCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.doctorTimeOff.create({
      data,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findTimeOffById(id: string) {
    return this.getReadClient().doctorTimeOff.findUnique({
      where: { id },
    });
  }

  async updateTimeOff(
    id: string,
    data: Prisma.DoctorTimeOffUpdateInput,
    expectedVersion?: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    if (expectedVersion !== undefined) {
      const result = await client.doctorTimeOff.updateMany({
        where: { id, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new Error(
          `DoctorTimeOff ${id} version conflict (expected ${expectedVersion})`,
        );
      }
      return client.doctorTimeOff.findUniqueOrThrow({ where: { id } });
    }
    return client.doctorTimeOff.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async deleteTimeOff(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.doctorTimeOff.delete({ where: { id } });
  }
}
