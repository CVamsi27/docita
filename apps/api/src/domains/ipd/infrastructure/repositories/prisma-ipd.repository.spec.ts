import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AdmissionStatus, BedStatus } from '@workspace/db';
import { PrismaIpdRepository } from './prisma-ipd.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { type IClock } from '@/shared/common/ports/clock.port';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

const CLINIC = 'clinic-1';
const DOCTOR = 'doctor-1';
const NOW = new Date('2026-06-01T09:00:00.000Z');

describe('PrismaIpdRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {
    ward: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    admission: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    bed: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    patient: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    user: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
  };

  // The transactional client the repository sees inside `$transaction`. It is
  // a distinct object from `prismaMock` on purpose: a claim that is lost must
  // not be able to fall through to a different handle.
  let repository: PrismaIpdRepository;
  let tx: {
    $queryRaw: jest.Mock<AnyAsync>;
    bed: Record<string, jest.Mock<AnyAsync>>;
    admission: Record<string, jest.Mock<AnyAsync>>;
  };
  let transaction: jest.Mock<AnyAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }

    tx = {
      // The patient-scoped advisory lock that serialises the active-admission
      // check-and-insert runs through `$queryRaw` inside the transaction.
      $queryRaw: jest.fn<AnyAsync>().mockResolvedValue([]),
      bed: { updateMany: jest.fn<AnyAsync>() },
      admission: {
        findFirst: jest.fn<AnyAsync>(),
        create: jest.fn<AnyAsync>(),
        updateMany: jest.fn<AnyAsync>(),
        findUniqueOrThrow: jest.fn<AnyAsync>(),
      },
    };
    transaction = jest.fn<AnyAsync>(
      (...args: unknown[]) =>
        Promise.resolve(
          (args[0] as (client: unknown) => unknown)(tx),
        ) as Promise<unknown>,
    );
    Object.defineProperty(prismaService, '$transaction', {
      value: transaction,
      writable: true,
    });

    const clock: IClock = { now: () => NOW };
    repository = new PrismaIpdRepository(
      prismaService as never,
      clock as never,
    );
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });

  describe('admitPatient bed claim', () => {
    const seedAvailableBed = (status = BedStatus.AVAILABLE) =>
      prismaMock.bed.findFirst.mockResolvedValue({
        id: 'bed-1',
        status,
        bedNumber: 'A-101',
      });
    const seedClinicRefs = () => {
      prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prismaMock.user.findFirst.mockResolvedValue({ id: DOCTOR });
      tx.admission.findFirst.mockResolvedValue(null);
    };
    const admit = () =>
      repository.admitPatient(CLINIC, {
        patientId: 'patient-1',
        bedId: 'bed-1',
        admittingDoctorId: DOCTOR,
      } as never);

    it('claims the bed with a status-gated conditional update', async () => {
      seedClinicRefs();
      seedAvailableBed();
      tx.bed.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.create.mockResolvedValue({ id: 'admission-1' });

      await admit();

      expect(tx.bed.updateMany).toHaveBeenCalledWith({
        where: { id: 'bed-1', status: BedStatus.AVAILABLE },
        data: { status: BedStatus.OCCUPIED },
      });
    });

    it('rejects and writes nothing when the conditional claim is lost', async () => {
      // The availability read above the transaction still said AVAILABLE, but
      // another admission won the race. `count: 0` is the authoritative
      // signal, so no admission row may be created.
      seedClinicRefs();
      seedAvailableBed();
      tx.bed.updateMany.mockResolvedValue({ count: 0 });

      await expect(admit()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.admission.create).not.toHaveBeenCalled();
    });

    it('does not admit a patient who already has an active admission', async () => {
      seedClinicRefs();
      seedAvailableBed();
      tx.admission.findFirst.mockResolvedValue({ id: 'admission-existing' });

      await expect(admit()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.bed.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a bed that does not belong to the facility', async () => {
      seedClinicRefs();
      prismaMock.bed.findFirst.mockResolvedValue(null);

      await expect(admit()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('transferPatient bed claim', () => {
    const seedActiveAdmission = (overrides: Record<string, unknown> = {}) =>
      prismaMock.admission.findFirst.mockResolvedValue({
        id: 'admission-1',
        status: AdmissionStatus.ADMITTED,
        bedId: 'bed-1',
        bedNumber: 'A-101',
        notes: null,
        ...overrides,
      });
    const transfer = () =>
      repository.transferPatient(CLINIC, {
        admissionId: 'admission-1',
        toBedId: 'bed-2',
        reason: 'step-down',
      } as never);

    it('claims the target bed before releasing the source bed', async () => {
      seedActiveAdmission();
      prismaMock.bed.findFirst.mockResolvedValue({
        id: 'bed-2',
        status: BedStatus.AVAILABLE,
        bedNumber: 'A-102',
      });
      tx.bed.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.findUniqueOrThrow.mockResolvedValue({ id: 'admission-1' });

      await transfer();

      const bedCalls = tx.bed.updateMany.mock.calls;
      expect(bedCalls).toHaveLength(2);
      expect(bedCalls[0][0]).toMatchObject({
        where: { id: 'bed-2', status: BedStatus.AVAILABLE },
        data: { status: BedStatus.OCCUPIED },
      });
      expect(bedCalls[1][0]).toMatchObject({
        where: { id: 'bed-1', status: BedStatus.OCCUPIED },
        data: { status: BedStatus.AVAILABLE },
      });
    });

    it('rejects without releasing the source bed when the target claim is lost', async () => {
      seedActiveAdmission();
      prismaMock.bed.findFirst.mockResolvedValue({
        id: 'bed-2',
        status: BedStatus.AVAILABLE,
        bedNumber: 'A-102',
      });
      tx.bed.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(transfer()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.bed.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.admission.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a stale transfer that lost the admission to a concurrent discharge', async () => {
      seedActiveAdmission();
      prismaMock.bed.findFirst.mockResolvedValue({
        id: 'bed-2',
        status: BedStatus.AVAILABLE,
        bedNumber: 'A-102',
      });
      tx.bed.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.updateMany.mockResolvedValue({ count: 0 });

      await expect(transfer()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.admission.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('gates the move on the bed the admission was decided against', async () => {
      // A status-only gate lets two transfers out of one bed both land: the
      // second overwrites the first move and strands its target bed.
      seedActiveAdmission();
      prismaMock.bed.findFirst.mockResolvedValue({
        id: 'bed-2',
        status: BedStatus.AVAILABLE,
        bedNumber: 'A-102',
      });
      tx.bed.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.findUniqueOrThrow.mockResolvedValue({ id: 'admission-1' });

      await transfer();

      expect(tx.admission.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'admission-1',
          status: AdmissionStatus.ADMITTED,
          bedId: 'bed-1',
        },
        data: expect.objectContaining({ bedId: 'bed-2' }),
      });
    });

    it('refuses to transfer an admission that is not active', async () => {
      seedActiveAdmission({ status: AdmissionStatus.DISCHARGED });

      await expect(transfer()).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('dischargePatient ownership', () => {
    const discharge = () =>
      repository.dischargePatient(CLINIC, {
        admissionId: 'admission-1',
        dischargeSummary: 'stable',
      } as never);

    const seedActiveAdmission = () =>
      prismaMock.admission.findFirst.mockResolvedValue({
        id: 'admission-1',
        status: AdmissionStatus.ADMITTED,
        bedId: 'bed-1',
        bedNumber: 'A-101',
        notes: null,
      });

    it('discharges with a status-gated update, then frees the bed', async () => {
      seedActiveAdmission();
      tx.admission.updateMany.mockResolvedValue({ count: 1 });
      tx.bed.updateMany.mockResolvedValue({ count: 1 });
      tx.admission.findUniqueOrThrow.mockResolvedValue({ id: 'admission-1' });

      await discharge();

      expect(tx.admission.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'admission-1',
          status: AdmissionStatus.ADMITTED,
          bedId: 'bed-1',
        },
        data: expect.objectContaining({
          status: AdmissionStatus.DISCHARGED,
          dischargedAt: NOW,
        }),
      });
      expect(tx.bed.updateMany).toHaveBeenCalledWith({
        where: { id: 'bed-1', status: BedStatus.OCCUPIED },
        data: { status: BedStatus.AVAILABLE },
      });
    });

    it('rejects a repeated discharge and leaves the bed untouched', async () => {
      // The pre-transaction read saw ADMITTED, but a concurrent discharge
      // already flipped it. Frees nothing.
      seedActiveAdmission();
      tx.admission.updateMany.mockResolvedValue({ count: 0 });

      await expect(discharge()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.bed.updateMany).not.toHaveBeenCalled();
      expect(tx.admission.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('refuses to discharge an admission that is not active', async () => {
      prismaMock.admission.findFirst.mockResolvedValue({
        id: 'admission-1',
        status: AdmissionStatus.DISCHARGED,
        bedId: 'bed-1',
      });

      await expect(discharge()).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
