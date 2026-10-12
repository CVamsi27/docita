import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  INestApplication,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { AdmissionStatus, BedStatus } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { PrismaIpdRepository } from '@/domains/ipd/infrastructure/repositories/prisma-ipd.repository';
import type { IClock } from '@/shared/common/ports/clock.port';

/**
 * W02 — IPD bed allocation.
 *
 * A bed is a physical single-occupancy resource. Every bed state change used
 * to be read-then-write: `admitPatient` read availability outside the
 * transaction and then wrote unconditionally, `transferPatient` released the
 * source before claiming the target, and `dischargePatient` rewrote whatever it
 * found. Under READ COMMITTED that permits two live admissions in one bed, or
 * a retry that frees a bed the next patient has already moved into.
 *
 * The fix is a conditional claim (`UPDATE ... WHERE status = <expected>`) whose
 * row count is the single-winner signal. This suite runs the real repository
 * against real PostgreSQL so that SQL is what is under test.
 */
describe('IPD bed allocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaIpdRepository;
  let clinicId: string;
  let doctorId: string;

  const clock: IClock = { now: () => new Date('2026-06-01T12:00:00.000Z') };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  /** Reports whether a promise has settled yet, without awaiting it. */
  const trackSettlement = (promise: Promise<unknown>) => {
    let state: 'pending' | 'resolved' | 'rejected' = 'pending';
    promise.then(
      () => {
        state = 'resolved';
      },
      () => {
        state = 'rejected';
      },
    );
    return () => state;
  };

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
    repository = new PrismaIpdRepository(prisma, clock);
  });

  beforeEach(async () => {
    await resetDatabase();
    const clinic = await factories.clinic();
    const doctor = (await factories.user({ clinicId: clinic.id })).user;
    clinicId = clinic.id;
    doctorId = doctor.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  const seedBeds = async (count: number) => {
    const ward = await prisma.ward.create({
      data: {
        clinicId,
        name: 'General Ward',
        type: 'GENERAL',
        floorNumber: '1',
      },
    });
    const room = await prisma.room.create({
      data: { wardId: ward.id, clinicId, roomNumber: '101' },
    });
    return Promise.all(
      Array.from({ length: count }, (_, i) =>
        prisma.bed.create({
          data: {
            roomId: room.id,
            clinicId,
            bedNumber: `A-${101 + i}`,
            status: BedStatus.AVAILABLE,
          },
        }),
      ),
    );
  };

  const patients = async (count: number) =>
    Promise.all(
      Array.from({ length: count }, () => factories.patient(clinicId)),
    );

  const admit = (patientId: string, bedId: string) =>
    repository.admitPatient(clinicId, {
      patientId,
      bedId,
      admittingDoctorId: doctorId,
      admissionReason: 'observation',
    } as never);

  const transfer = (admissionId: string, toBedId: string) =>
    repository.transferPatient(clinicId, {
      admissionId,
      toBedId,
      reason: 'step-down',
    } as never);

  const discharge = (admissionId: string) =>
    repository.dischargePatient(clinicId, {
      admissionId,
      dischargeSummary: 'stable',
    } as never);

  const bedStatus = async (bedId: string) =>
    (await prisma.bed.findUniqueOrThrow({ where: { id: bedId } })).status;

  // `Admission.clinicId` is nullable and admissions are created without it, so
  // the clinic scope has to travel the ward relation exactly as the repository
  // itself does.
  const liveAdmissionCount = (bedId?: string) =>
    prisma.admission.count({
      where: {
        status: AdmissionStatus.ADMITTED,
        bed: { room: { ward: { clinicId } } },
        ...(bedId ? { bedId } : {}),
      },
    });

  const bedStatusesInOrder = async () =>
    (await prisma.bed.findMany({ orderBy: { bedNumber: 'asc' } })).map(
      (bed) => bed.status,
    );

  /**
   * Commits a bed status change in a transaction that deliberately holds the
   * bed row lock open, so any concurrent caller that touches that bed blocks
   * partway through its own work.
   */
  const holdBedStatusChange = async (bedId: string, status: BedStatus) => {
    let rowLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      rowLocked = resolve;
    });
    let commitNow!: () => void;
    const mayCommit = new Promise<void>((resolve) => {
      commitNow = resolve;
    });

    const holder = prisma.$transaction(async (tx) => {
      await tx.bed.update({ where: { id: bedId }, data: { status } });
      rowLocked();
      await mayCommit;
    });

    await locked;
    return {
      release: async () => {
        commitNow();
        await holder;
      },
    };
  };

  /**
   * Applies a competing discharge in a transaction that deliberately holds the
   * admission row lock open, then commits on cue. Any caller that already read
   * the row as ADMITTED will block on its `UPDATE ... WHERE status = 'ADMITTED'`
   * and only then learn it lost — exactly the interleaving the ownership gate
   * has to survive. `dischargedAt` is deliberately distinctive so a test can
   * tell the winner's write from a stale rewrite.
   */
  const holdCompetingDischarge = async (admissionId: string, bedId: string) => {
    const competingDischargeAt = new Date('2026-01-01T00:00:00.000Z');
    let rowLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      rowLocked = resolve;
    });
    let commitNow!: () => void;
    const mayCommit = new Promise<void>((resolve) => {
      commitNow = resolve;
    });

    const holder = prisma.$transaction(async (tx) => {
      await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargedAt: competingDischargeAt,
        },
      });
      await tx.bed.update({
        where: { id: bedId },
        data: { status: BedStatus.AVAILABLE },
      });
      rowLocked();
      await mayCommit;
    });

    await locked;
    return {
      competingDischargeAt,
      release: async () => {
        commitNow();
        await holder;
      },
    };
  };

  describe('admission', () => {
    it('admits exactly one patient when eight race for the same bed', async () => {
      const [bed] = await seedBeds(1);
      const waiting = await patients(8);

      const results = await Promise.allSettled(
        waiting.map((patient) => admit(patient.id, bed.id)),
      );

      const admitted = results.filter((r) => r.status === 'fulfilled');
      expect(admitted).toHaveLength(1);
      for (const loser of results.filter((r) => r.status === 'rejected')) {
        expect((loser as PromiseRejectedResult).reason).toBeInstanceOf(
          ConflictException,
        );
      }

      // The clinical invariant: one bed, one live patient.
      expect(await liveAdmissionCount(bed.id)).toBe(1);
      expect(await bedStatus(bed.id)).toBe(BedStatus.OCCUPIED);
    });

    it('admits exactly one patient under sustained contention', async () => {
      const [bed] = await seedBeds(1);
      const waiting = await patients(12);

      const results = await Promise.allSettled(
        waiting.map((patient) => admit(patient.id, bed.id)),
      );

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await liveAdmissionCount(bed.id)).toBe(1);
    });

    it('rejects a later admission once the bed is taken', async () => {
      const [bed] = await seedBeds(1);
      const [first, second] = await patients(2);

      await admit(first.id, bed.id);

      await expect(admit(second.id, bed.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(await liveAdmissionCount(bed.id)).toBe(1);
    });

    it('admits into an independent bed while another bed is busy', async () => {
      const [bedA, bedB] = await seedBeds(2);
      const [first, second] = await patients(2);

      await admit(first.id, bedA.id);
      await admit(second.id, bedB.id);

      expect(await liveAdmissionCount()).toBe(2);
    });

    it('reuses a bed freed by a discharge', async () => {
      const [bed] = await seedBeds(1);
      const [first, second] = await patients(2);

      const admission = await admit(first.id, bed.id);
      await discharge(admission.id);

      await admit(second.id, bed.id);

      expect(await liveAdmissionCount(bed.id)).toBe(1);
      expect(await bedStatus(bed.id)).toBe(BedStatus.OCCUPIED);
    });
  });

  describe('transfer', () => {
    it('releases the source and occupies the target on a clean move', async () => {
      const [bedA, bedB] = await seedBeds(2);
      const [patient] = await patients(1);
      const admission = await admit(patient.id, bedA.id);

      const moved = await transfer(admission.id, bedB.id);

      expect(moved.bedId).toBe(bedB.id);
      expect(moved.status).toBe(AdmissionStatus.ADMITTED);
      expect(await bedStatusesInOrder()).toEqual([
        BedStatus.AVAILABLE,
        BedStatus.OCCUPIED,
      ]);
    });

    it('moves exactly one admission when two contend for the same free bed', async () => {
      const [bedA, bedB, bedC] = await seedBeds(3);
      const [p1, p2] = await patients(2);
      const a1 = await admit(p1.id, bedA.id);
      const a2 = await admit(p2.id, bedB.id);

      // bedC is free, so both transfers pass the availability fast path and
      // race on the conditional claim inside their transactions.
      const results = await Promise.allSettled([
        transfer(a1.id, bedC.id),
        transfer(a2.id, bedC.id),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      for (const loser of results.filter((r) => r.status === 'rejected')) {
        expect((loser as PromiseRejectedResult).reason).toBeInstanceOf(
          ConflictException,
        );
      }

      expect(await liveAdmissionCount(bedC.id)).toBe(1);
      expect(await bedStatus(bedC.id)).toBe(BedStatus.OCCUPIED);
      expect(await liveAdmissionCount()).toBe(2);
    });

    it('rejects a transfer onto an occupied bed without moving the patient', async () => {
      const [bedA, bedB] = await seedBeds(2);
      const [p1, p2] = await patients(2);
      const a1 = await admit(p1.id, bedA.id);
      await admit(p2.id, bedB.id);

      await expect(transfer(a1.id, bedB.id)).rejects.toBeInstanceOf(
        ConflictException,
      );

      const unchanged = await prisma.admission.findUniqueOrThrow({
        where: { id: a1.id },
      });
      expect(unchanged.bedId).toBe(bedA.id);
      expect(await bedStatusesInOrder()).toEqual([
        BedStatus.OCCUPIED,
        BedStatus.OCCUPIED,
      ]);
    });

    it('rolls the target claim back when the transfer loses the admission', async () => {
      const [bedA, bedB] = await seedBeds(2);
      const [patient] = await patients(1);
      const admission = await admit(patient.id, bedA.id);

      // A competing discharge commits while the transfer is mid-flight. The
      // transfer has already claimed bedB by then, so the only thing standing
      // between the caller and a ghost OCCUPIED bed is the ownership gate plus
      // the transaction rollback that follows it.
      const holder = await holdCompetingDischarge(admission.id, bedA.id);
      const pending = transfer(admission.id, bedB.id);
      await sleep(50);
      await holder.release();

      await expect(pending).rejects.toBeInstanceOf(ConflictException);

      expect(await bedStatus(bedB.id)).toBe(BedStatus.AVAILABLE);
      expect(await bedStatus(bedA.id)).toBe(BedStatus.AVAILABLE);
    });

    it('claims the target bed before releasing the source bed', async () => {
      const [bedA, bedB] = await seedBeds(2);
      const [patient, rival] = await patients(2);
      const admission = await admit(patient.id, bedA.id);

      // A competing actor holds a lock on the source bed, so the transfer
      // suspends partway through its transaction. Claiming the target first
      // means the transfer already owns bedB's row while it waits; releasing
      // first would leave bedB free for the whole wait, and a competing
      // admission would win it.
      const holder = await holdBedStatusChange(bedA.id, BedStatus.AVAILABLE);
      const pending = transfer(admission.id, bedB.id);
      await sleep(100);

      const transferState = trackSettlement(pending);
      expect(transferState()).toBe('pending');

      const competitor = admit(rival.id, bedB.id);
      const competitorState = trackSettlement(competitor);
      await sleep(100);

      // The transfer already holds bedB, so the competitor is suspended on the
      // same row rather than winning the bed outright.
      expect(competitorState()).toBe('pending');

      await holder.release();

      await expect(pending).resolves.toMatchObject({ bedId: bedB.id });
      await expect(competitor).rejects.toBeInstanceOf(ConflictException);
      expect(await liveAdmissionCount(bedB.id)).toBe(1);
    });
  });

  describe('discharge', () => {
    it('discharges once and frees the bed', async () => {
      const [bed] = await seedBeds(1);
      const [patient] = await patients(1);
      const admission = await admit(patient.id, bed.id);

      const discharged = await discharge(admission.id);

      expect(discharged.status).toBe(AdmissionStatus.DISCHARGED);
      expect(discharged.dischargedAt).toEqual(clock.now());
      expect(await bedStatus(bed.id)).toBe(BedStatus.AVAILABLE);
      expect(await liveAdmissionCount()).toBe(0);
    });

    it('refuses a repeated discharge at the status guard and frees the bed only once', async () => {
      const [bed] = await seedBeds(1);
      const [patient] = await patients(1);
      const admission = await admit(patient.id, bed.id);

      const first = await discharge(admission.id);
      const originalDischargeAt = first.dischargedAt;

      // The retry sees DISCHARGED in the pre-transaction read, so it is turned
      // away before it can touch a bed.
      await expect(discharge(admission.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      const reloaded = await prisma.admission.findUniqueOrThrow({
        where: { id: admission.id },
      });
      expect(reloaded.dischargedAt).toEqual(originalDischargeAt);
      expect(await bedStatus(bed.id)).toBe(BedStatus.AVAILABLE);
    });

    it('does not rewrite the winning discharge when a stale call wins the race', async () => {
      const [bed] = await seedBeds(1);
      const [patient] = await patients(1);
      const admission = await admit(patient.id, bed.id);

      // A competing operator discharge commits while our call is mid-flight.
      // Our pre-transaction read already saw ADMITTED, so the in-transaction
      // ownership gate is the layer that must stop it.
      const holder = await holdCompetingDischarge(admission.id, bed.id);
      const pending = discharge(admission.id);
      await sleep(50);
      await holder.release();

      await expect(pending).rejects.toBeInstanceOf(ConflictException);

      const reloaded = await prisma.admission.findUniqueOrThrow({
        where: { id: admission.id },
      });
      // The competing discharge's write survives untouched.
      expect(reloaded.dischargedAt).toEqual(holder.competingDischargeAt);
      expect(reloaded.notes).toBeNull();
      expect(await bedStatus(bed.id)).toBe(BedStatus.AVAILABLE);
    });

    it('does not free a bed the next patient has already taken', async () => {
      const [bed] = await seedBeds(1);
      const [first, second] = await patients(2);
      const admission = await admit(first.id, bed.id);
      await discharge(admission.id);

      // The next patient is now in the bed a retried discharge would "free".
      const replacement = await admit(second.id, bed.id);
      expect(await bedStatus(bed.id)).toBe(BedStatus.OCCUPIED);

      await expect(discharge(admission.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(await bedStatus(bed.id)).toBe(BedStatus.OCCUPIED);
      const stillLive = await prisma.admission.findUniqueOrThrow({
        where: { id: replacement.id },
      });
      expect(stillLive.status).toBe(AdmissionStatus.ADMITTED);
    });
  });
});
