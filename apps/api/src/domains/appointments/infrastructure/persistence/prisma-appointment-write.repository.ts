import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { IAppointmentWriteRepository } from '@/domains/appointments/core/repositories/appointment-write.repository.interface';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentMapper } from '@/domains/appointments/infrastructure/mappers/appointment.mapper';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import {
  Prisma,
  QueueTokenStatus,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { isPrismaExclusionViolation } from '@/shared/common/utils/prisma-exclusion-violation';
import { APPOINTMENT_STATUS_TO_PRISMA } from '@/domains/appointments/infrastructure/mappers/appointment.mapper';

import { appointmentOverlapProblem } from '@/shared/common/errors/appointment-overlap-problem';

const APPOINTMENT_OVERLAP_CONSTRAINT = 'Appointment_no_active_overlap';

function translateAppointmentWriteError(error: unknown): never {
  if (isPrismaExclusionViolation(error, APPOINTMENT_OVERLAP_CONSTRAINT)) {
    throw appointmentOverlapProblem();
  }

  throw error;
}

@Injectable()
export class PrismaAppointmentWriteRepository implements IAppointmentWriteRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async save(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);

    try {
      await this.prisma.appointment.create({
        data,
      });
    } catch (error) {
      translateAppointmentWriteError(error);
    }
  }

  async update(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);
    const { id, clinicId, ...updateData } = data;

    if (!clinicId || typeof clinicId !== 'string')
      throw new BadRequestException('Appointment clinicId is required');

    const result = await this.prisma.appointment
      .updateMany({
        where: { id, clinicId },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      })
      .catch(translateAppointmentWriteError);
    if (result.count === 0) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.appointment.deleteMany({
      where: { id, clinicId },
    });
  }

  // jscpd:ignore-start
  /**
   * Start a consultation as a compare-and-set on the status the caller decided
   * against. A start that was decided while the visit was live must not win
   * after the visit finished, so the write only applies while the row still
   * holds `currentStatus`; a terminal appointment is never reopened. The queue
   * token carries the same precondition, and both writes share one
   * transaction so a rejected token rolls the appointment back.
   */
  async startConsultationTx(
    id: string,
    clinicId: string,
    queueToken: {
      id: string;
      calledAt: Date | null;
      consultationStart: Date | null;
    } | null,
    currentStatus: AppointmentStatusEnum,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // jscpd:ignore-end
      const result = await tx.appointment.updateMany({
        where: {
          id,
          clinicId,
          status: APPOINTMENT_STATUS_TO_PRISMA[currentStatus],
        },
        data: {
          status: PrismaAppointmentStatus.IN_PROGRESS,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        const current = await tx.appointment.findFirst({
          where: { id, clinicId },
          select: { status: true },
        });
        if (!current) {
          throw new NotFoundException(`Appointment with ID ${id} not found`);
        }
        throw new ConflictException(
          `Appointment is now ${current.status} and cannot be reopened; reload it before retrying`,
        );
      }

      if (queueToken) {
        const now = this.clock.now();
        const startTime = queueToken.consultationStart ?? now;
        const calledAt = queueToken.calledAt ?? now;
        const tokenResult = await tx.queueToken.updateMany({
          where: {
            id: queueToken.id,
            status: {
              in: [QueueTokenStatus.WAITING, QueueTokenStatus.IN_PROGRESS],
            },
          },
          data: {
            status: QueueTokenStatus.IN_PROGRESS,
            calledAt,
            consultationStart: startTime,
          },
        });
        if (tokenResult.count === 0) {
          throw new ConflictException(
            'Queue entry already finished; the consultation was not reopened',
          );
        }
      }
    });
  }

  /**
   * Partial update. When the patch moves `status`, the write is a
   * compare-and-set on `expectedStatus` (the status the caller read), so an
   * action built against a stale view — an in-flight consultation autosave, a
   * retried request — cannot reopen a visit that has since finished. Patches
   * without a status keep the unconditional write: post-completion clinical
   * edits stay allowed (ADR 0013 §C2.1 defers a write lock for them).
   * Returns 0 when the row is missing for this clinic; a stale status raises a
   * conflict instead.
   */
  async applyPatch(
    id: string,
    clinicId: string,
    patch: Prisma.AppointmentUpdateInput,
    expectedStatus?: AppointmentStatusEnum,
  ): Promise<number> {
    const guardsStatus =
      patch.status !== undefined && expectedStatus !== undefined;
    const result = await this.prisma.appointment
      .updateMany({
        where: {
          id,
          clinicId,
          ...(guardsStatus
            ? { status: APPOINTMENT_STATUS_TO_PRISMA[expectedStatus] }
            : {}),
        },
        data: { ...patch, version: { increment: 1 } },
      })
      .catch(translateAppointmentWriteError);

    if (result.count === 0 && guardsStatus) {
      const current = await this.prisma.appointment.findFirst({
        where: { id, clinicId },
        select: { status: true },
      });
      if (current) {
        throw new ConflictException(
          `Appointment is now ${current.status}; the stale update was not applied`,
        );
      }
    }

    return result.count;
  }
}
