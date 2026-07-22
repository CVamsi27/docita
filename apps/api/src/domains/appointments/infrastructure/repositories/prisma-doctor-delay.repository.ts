import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
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
        // No `take`: bounded by (clinicId, doctorId, today, active status).
        // We are explicitly shifting every remaining appointment in the day,
        // so the full set must be read; capping would silently drop shifts.
      });

      const shiftMs = command.delayMinutes * 60 * 1000;
      const ids = upcoming.map((appt) => appt.id);
      await Promise.all(
        upcoming.map((appt) =>
          tx.appointment.update({
            where: { id: appt.id },
            data: {
              startTime: new Date(appt.startTime.getTime() + shiftMs),
              endTime: new Date(appt.endTime.getTime() + shiftMs),
              originalStartTime: appt.originalStartTime ?? appt.startTime,
            },
          }),
        ),
      );
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
      // No `take`: bounded by (clinicId, isActive: true). Active delays per
      // clinic are a small control-plane set, and the caller (UI banner) needs
      // the full set to render the in-clinic delay board.
    });
  }
}
