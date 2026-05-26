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
});
