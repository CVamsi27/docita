import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaAppointmentWriteRepository } from './prisma-appointment-write.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('PrismaAppointmentWriteRepository overlap translation', () => {
  const create = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const updateMany =
    jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();

  const prismaService = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperty(prismaService, 'appointment', {
    value: { create, updateMany },
    writable: true,
  });

  const clock: IClock = { now: () => new Date('2026-05-25T12:00:00.000Z') };
  let repository: PrismaAppointmentWriteRepository;

  const appointment = new Appointment({
    id: 'apt-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-05-25T10:00:00.000Z'),
    endTime: new Date('2026-05-25T10:30:00.000Z'),
    status: AppointmentStatus.scheduled(),
    type: 'Standard',
    metadata: {},
    createdAt: new Date('2026-05-25T09:00:00.000Z'),
    updatedAt: new Date('2026-05-25T09:00:00.000Z'),
    version: 1,
  });

  const exclusionError = new Prisma.PrismaClientUnknownRequestError(
    'conflicting key value violates exclusion constraint "Appointment_no_active_overlap"',
    { clientVersion: 'test' },
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaAppointmentWriteRepository(prismaService, clock);
  });

  describe('save', () => {
    it('translates an exclusion-constraint violation into BadRequestException', async () => {
      create.mockRejectedValueOnce(exclusionError);

      const error = await repository.save(appointment).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        detail: 'Doctor has conflicting appointment',
      });
    });

    it('rethrows other Prisma errors untouched', async () => {
      const other = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2002',
        clientVersion: 'test',
      });
      create.mockRejectedValueOnce(other);

      await expect(repository.save(appointment)).rejects.toBe(other);
    });

    it('resolves when the insert succeeds', async () => {
      create.mockResolvedValueOnce({});

      await expect(repository.save(appointment)).resolves.toBeUndefined();
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('translates exclusion violations into BadRequestException', async () => {
      updateMany.mockRejectedValueOnce(exclusionError);

      await expect(repository.update(appointment)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when no row was updated', async () => {
      updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(repository.update(appointment)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resolves and increments version when row was updated', async () => {
      updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(repository.update(appointment)).resolves.toBeUndefined();
      const call = updateMany.mock.calls[0]?.[0] as
        | { data?: { version?: unknown } }
        | undefined;
      expect(call?.data?.version).toEqual({ increment: 1 });
    });
  });

  describe('applyPatch', () => {
    it('translates exclusion violations into BadRequestException', async () => {
      updateMany.mockRejectedValueOnce(exclusionError);

      await expect(
        repository.applyPatch('apt-1', 'clinic-1', { notes: 'updated' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the count when the update succeeds', async () => {
      updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(
        repository.applyPatch('apt-1', 'clinic-1', { notes: 'updated' }),
      ).resolves.toBe(1);
    });
  });

  // The appointment `delete` is a hard deleteMany against the Prisma
  // appointment table. It deliberately does NOT soft-delete (no cancelledAt /
  // deletedAt on Appointment) because the lifecycle has its own
  // status=CANCELLED state for that. The hard delete is gated upstream by
  // status checks; this block pins the raw Prisma call and documents the
  // foreign-key risk: VitalSign and FollowUp both have implicit Restrict
  // relations to Appointment, so calling delete on an appointment that has
  // any vital signs or follow-ups will surface a P2003 to the caller. The
  // controller path is responsible for refusing the call in that case; if
  // a future change ever moves delete to be reachable from a code path
  // that does not pre-check dependents, this test will fail loudly.
  describe('delete', () => {
    const deleteMany = jest.fn<(...args: unknown[]) => Promise<unknown>>();

    beforeEach(() => {
      deleteMany.mockReset();
      const prismaWithDelete = Object.create(
        PrismaService.prototype,
      ) as PrismaService;
      Object.defineProperty(prismaWithDelete, 'appointment', {
        value: { create, updateMany, deleteMany },
        writable: true,
      });
      repository = new PrismaAppointmentWriteRepository(
        prismaWithDelete,
        clock,
      );
    });

    it('scopes the deleteMany to (id, clinicId) and resolves on success', async () => {
      deleteMany.mockResolvedValueOnce({ count: 1 });

      await expect(
        repository.delete('apt-1', 'clinic-1'),
      ).resolves.toBeUndefined();
      expect(deleteMany).toHaveBeenCalledWith({
        where: { id: 'apt-1', clinicId: 'clinic-1' },
      });
    });

    it('does not pre-check dependents — surfaces Prisma P2003 from the DB', async () => {
      // FK risk characterization: VitalSign and FollowUp both have implicit
      // Restrict on appointmentId. If a caller deletes an appointment that
      // has either, the DB raises P2003 and this method rethrows it.
      const fkError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field',
        { code: 'P2003', clientVersion: 'test' },
      );
      deleteMany.mockRejectedValueOnce(fkError);

      await expect(repository.delete('apt-1', 'clinic-1')).rejects.toBe(
        fkError,
      );
    });
  });
});
