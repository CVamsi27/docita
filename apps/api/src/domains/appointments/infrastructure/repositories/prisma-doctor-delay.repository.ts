import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import {
  type DoctorDelayRecord,
  type IDoctorDelayRepository,
  type MarkDoctorDelayPersistenceCommand,
} from '@/domains/appointments/application/ports/doctor-delay.repository.port';

@Injectable()
export class PrismaDoctorDelayRepository implements IDoctorDelayRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async markDelayAndShiftAppointments(
    command: MarkDoctorDelayPersistenceCommand,
  ): Promise<{ delay: DoctorDelayRecord; affectedAppointmentIds: string[] }> {
    const now = this.clock.now();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [delay, affectedIds] = await this.prisma.$transaction(async (tx) => {
      await tx.doctorDelay.updateMany({
        where: {
          clinicId: command.clinicId,
          doctorId: command.doctorId,
          isActive: true,
        },
        data: { isActive: false, clearedAt: now },
      });

      const newDelay = await tx.doctorDelay.create({
        data: {
          clinicId: command.clinicId,
          doctorId: command.doctorId,
          delayMinutes: command.delayMinutes,
          reason: command.reason,
          markedById: command.markedById,
        },
      });

      const upcoming = await tx.appointment.findMany({
        where: {
          clinicId: command.clinicId,
          doctorId: command.doctorId,
          startTime: { gte: now, lte: endOfDay },
          status: { notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          originalStartTime: true,
        },
        orderBy: { startTime: 'asc' },
      });

      const shiftMs = command.delayMinutes * 60 * 1000;
      const ids: string[] = [];

      for (const appt of upcoming) {
        const newStart = new Date(appt.startTime.getTime() + shiftMs);
        const newEnd = new Date(appt.endTime.getTime() + shiftMs);
        await tx.appointment.update({
          where: { id: appt.id },
          data: {
            startTime: newStart,
            endTime: newEnd,
            originalStartTime: appt.originalStartTime ?? appt.startTime,
          },
        });
        ids.push(appt.id);
      }

      return [newDelay, ids];
    });

    return { delay, affectedAppointmentIds: affectedIds };
  }

  async clearDelay(
    delayId: string,
    clinicId: string,
    clearedById: string,
  ): Promise<void> {
    await this.prisma.doctorDelay.update({
      where: { id: delayId },
      data: { isActive: false, clearedAt: this.clock.now(), clearedById },
    });
  }

  async findById(delayId: string): Promise<DoctorDelayRecord | null> {
    return this.prisma.doctorDelay.findUnique({ where: { id: delayId } });
  }

  async findActiveByDoctor(
    doctorId: string,
    clinicId: string,
  ): Promise<DoctorDelayRecord | null> {
    return this.prisma.doctorDelay.findFirst({
      where: { clinicId, doctorId, isActive: true },
      orderBy: { markedAt: 'desc' },
    });
  }

  async findActiveByClinic(clinicId: string): Promise<DoctorDelayRecord[]> {
    return this.prisma.doctorDelay.findMany({
      where: { clinicId, isActive: true },
      orderBy: { markedAt: 'desc' },
    });
  }
}
