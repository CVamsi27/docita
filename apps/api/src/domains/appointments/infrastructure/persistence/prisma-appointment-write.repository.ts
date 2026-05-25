import {
  BadRequestException,
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
import { isPrismaExclusionViolation } from '@/shared/common/utils/prisma-exclusion-violation';
import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';

/**
 * Name of the Postgres exclusion constraint added in migration
 * 20260525130000_appointment_overlap_exclusion. The DB enforces "no two active
 * appointments may overlap for the same (clinicId, doctorId)" regardless of
 * concurrent transactions; this helper translates the resulting 23P01 into
 * the same BadRequestException shape the application-level pre-flight check
 * already throws.
 */
const APPOINTMENT_OVERLAP_CONSTRAINT = 'Appointment_no_active_overlap';

async function withOverlapTranslation<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isPrismaExclusionViolation(error, APPOINTMENT_OVERLAP_CONSTRAINT)) {
      throw new BadRequestException({
        detail: 'Doctor has conflicting appointment',
      });
    }
    throw error;
  }
}

@Injectable()
export class PrismaAppointmentWriteRepository implements IAppointmentWriteRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async save(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);

    await withOverlapTranslation(
      this.prisma.appointment.create({
        data,
      }),
    );
  }

  async update(appointment: Appointment): Promise<void> {
    const data = AppointmentMapper.toPersistence(appointment);
    const { id, clinicId, ...updateData } = data;

    if (!clinicId || typeof clinicId !== 'string') {
      throw new BadRequestException('Appointment clinicId is required');
    }

    const result = await withOverlapTranslation(
      this.prisma.appointment.updateMany({
        where: { id, clinicId },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      }),
    );
    if (result.count === 0) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.appointment.deleteMany({
      where: { id, clinicId },
    });
  }

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
      if (currentStatus !== AppointmentStatusEnum.IN_PROGRESS) {
        const result = await tx.appointment.updateMany({
          where: { id, clinicId },
          data: {
            status: PrismaAppointmentStatus.IN_PROGRESS,
            version: { increment: 1 },
          },
        });
        if (result.count === 0) {
          throw new NotFoundException(`Appointment with ID ${id} not found`);
        }
      }

      if (queueToken) {
        const now = this.clock.now();
        const startTime = queueToken.consultationStart ?? now;
        const calledAt = queueToken.calledAt ?? now;
        await tx.queueToken.update({
          where: { id: queueToken.id },
          data: {
            status: 'IN_PROGRESS',
            calledAt,
            consultationStart: startTime,
          },
        });
      }
    });
  }

  async applyPatch(
    id: string,
    clinicId: string,
    patch: Prisma.AppointmentUpdateInput,
  ): Promise<number> {
    const result = await withOverlapTranslation(
      this.prisma.appointment.updateMany({
        where: { id, clinicId },
        data: { ...patch, version: { increment: 1 } },
      }),
    );
    return result.count;
  }
}
