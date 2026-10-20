import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { PrismaQueueRepository } from '@/domains/appointments/infrastructure/repositories/prisma-queue.repository';

/**
 * W01 — queue token identity.
 *
 * Token numbers are what a clinician calls from the waiting room, so two live
 * tokens sharing a number is a clinical-workflow failure. Allocation used to be
 * read-then-write, which let two parallel check-ins both read the same maximum
 * and insert the same number.
 *
 * This suite runs the allocator against real PostgreSQL so the advisory lock
 * and the (clinicId, tokenDay, tokenNumber) unique constraint are both in play.
 */
describe('Queue token allocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaQueueRepository;
  let clinicId: string;
  let patientId: string;
  let doctorId: string;

  const today = new Date('2026-06-01T00:00:00.000Z');

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
    repository = new PrismaQueueRepository(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    const clinic = await factories.clinic();
    const doctor = (await factories.user({ clinicId: clinic.id })).user;
    const patient = await factories.patient(clinic.id);
    clinicId = clinic.id;
    doctorId = doctor.id;
    patientId = patient.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  const allocate = (tokenType: string) =>
    repository.allocateToken(
      {
        clinicId,
        patientId,
        doctorId,
        tokenType,
        status: 'WAITING',
      } as never,
      today,
    );

  it('gives parallel allocations distinct token numbers', async () => {
    // The race this reproduces: eight concurrent check-ins each reading the
    // current maximum before any of them inserted.
    const tokens = await Promise.all(
      Array.from({ length: 8 }, (_, i) => allocate(`walk-in-${i}`)),
    );

    const numbers = tokens
      .map((token) => token.tokenNumber)
      .sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(tokens.map((token) => token.id)).size).toBe(8);
  });

  it('stores the allocation day on every token', async () => {
    const token = await allocate('walk-in');

    expect(token.tokenNumber).toBe(1);
    expect(token.tokenDay).not.toBeNull();
  });

  it('restarts numbering on a new day without colliding', async () => {
    const first = await allocate('walk-in');
    expect(first.tokenNumber).toBe(1);

    const nextDay = new Date('2026-06-02T00:00:00.000Z');
    const second = await repository.allocateToken(
      {
        clinicId,
        patientId,
        doctorId,
        tokenType: 'walk-in',
        status: 'WAITING',
      } as never,
      nextDay,
    );

    // Numbering restarts daily; the day is what keeps identities unique.
    expect(second.tokenNumber).toBe(1);
    expect(second.tokenDay?.toISOString().slice(0, 10)).toBe('2026-06-02');
    expect(first.tokenDay?.toISOString().slice(0, 10)).toBe('2026-06-01');
  });

  it('keeps numbering independent per clinic', async () => {
    const otherClinic = await factories.clinic();
    const otherPatient = await factories.patient(otherClinic.id);

    const mine = await allocate('walk-in');
    const theirs = await repository.allocateToken(
      {
        clinicId: otherClinic.id,
        patientId: otherPatient.id,
        tokenType: 'walk-in',
        status: 'WAITING',
      } as never,
      today,
    );

    expect(mine.tokenNumber).toBe(1);
    expect(theirs.tokenNumber).toBe(1);
  });

  it('refuses a duplicate token number at the database level', async () => {
    const first = await allocate('walk-in');
    expect(first.tokenNumber).toBe(1);

    // Bypassing the allocator entirely must still be rejected: the uniqueness
    // invariant lives in the schema, not only in the application.
    await expect(
      prisma.queueToken.create({
        data: {
          clinicId,
          patientId,
          doctorId,
          tokenType: 'walk-in',
          status: 'WAITING',
          tokenNumber: 1,
          tokenDay: today,
        },
      }),
    ).rejects.toThrow();

    const stored = await prisma.queueToken.findMany({
      where: { clinicId, tokenDay: today },
    });
    expect(stored).toHaveLength(1);
  });

  it('allows the same token number on different days for one clinic', async () => {
    const todayToken = await allocate('walk-in');
    const tomorrowToken = await repository.allocateToken(
      {
        clinicId,
        patientId,
        doctorId,
        tokenType: 'walk-in',
        status: 'WAITING',
      } as never,
      new Date('2026-06-02T00:00:00.000Z'),
    );

    expect(todayToken.tokenNumber).toBe(tomorrowToken.tokenNumber);
  });

  it('serializes a high-contention burst without gaps or duplicates', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 25 }, (_, i) => allocate(`burst-${i}`)),
    );

    const numbers = tokens.map((t) => t.tokenNumber).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});
