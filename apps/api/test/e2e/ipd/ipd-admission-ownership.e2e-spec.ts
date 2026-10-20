import { ConflictException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { AdmissionStatus, BedStatus } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  closeDatabase,
  getPrismaInstance,
  resetDatabase,
  setupTestDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { PrismaIpdRepository } from '@/domains/ipd/infrastructure/repositories/prisma-ipd.repository';
import type { IClock } from '@/shared/common/ports/clock.port';

/**
 * W02 — ownership of an admission, not just of a bed.
 *
 * `ipd-bed-allocation.e2e-spec.ts` proved the bed side: a conditional
 * `UPDATE ... WHERE status = <expected>` makes bed claims single-winner. Two
 * ownership questions sit next to it and are proved here.
 *
 * 1. **The patient.** One patient cannot be in two beds, but the only guard
 *    was a read-then-insert inside the transaction, with no database
 *    invariant behind it. Under READ COMMITTED parallel admissions of the same
 *    patient each read "no active admission" and each insert one.
 * 2. **The bed an admission currently holds.** A transfer's ownership gate was
 *    `status = 'ADMITTED'` only. Two transfers out of the same bed both pass it,
 *    so the second silently overwrites the first move and leaves the first
 *    target occupied by nobody.
 *
 * The invariant every test below asserts is the same one: a bed is OCCUPIED if
 * and only if exactly one ADMITTED admission points at it.
 */
describe('IPD admission ownership (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaIpdRepository;
  let clinicId: string;
  let doctorId: string;

  const clock: IClock = { now: () => new Date('2026-06-01T12:00:00.000Z') };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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

  const liveAdmissions = async () =>
    prisma.admission.findMany({
      where: { status: AdmissionStatus.ADMITTED },
      select: { id: true, patientId: true, bedId: true },
    });

  /**
   * The invariant both owners have to agree on: occupancy is exactly the set of
   * beds a live admission points at, with no duplicates and nothing stranded.
   */
  const expectOccupancyToBeConsistent = async () => {
    const live = await liveAdmissions();
    const occupied = (
      await prisma.bed.findMany({
        where: { status: BedStatus.OCCUPIED },
        select: { id: true },
      })
    ).map((bed) => bed.id);

    const admittedBedIds = live.map((admission) => admission.bedId);
    expect([...admittedBedIds].sort()).toEqual([...occupied].sort());
  };

  /** Settles every promise and splits the outcomes without short-circuiting. */
  const settleAll = async (promises: Promise<unknown>[]) => {
    const outcomes = await Promise.allSettled(promises);
    return {
      winners: outcomes.filter((o) => o.status === 'fulfilled'),
      losers: outcomes.filter(
        (o): o is PromiseRejectedResult => o.status === 'rejected',
      ),
    };
  };

  describe('one patient, one live admission', () => {
    it('admits a patient into at most one bed when admissions race', async () => {
      const beds = await seedBeds(8);
      const patient = await factories.patient(clinicId);

      const { winners, losers } = await settleAll(
        beds.map((bed) => admit(patient.id, bed.id)),
      );

      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(7);
      for (const loser of losers) {
        expect(loser.reason).toBeInstanceOf(ConflictException);
      }

      const live = await liveAdmissions();
      expect(live).toHaveLength(1);
      expect(live[0]?.patientId).toBe(patient.id);
      await expectOccupancyToBeConsistent();
    });

    it('leaves every bed free when a losing admission is rejected', async () => {
      const beds = await seedBeds(4);
      const patient = await factories.patient(clinicId);

      const { winners } = await settleAll(
        beds.map((bed) => admit(patient.id, bed.id)),
      );
      const winningBedId = (winners[0] as { value: { bedId: string } }).value
        .bedId;

      const statuses = await Promise.all(beds.map((bed) => bedStatus(bed.id)));
      expect(
        statuses.filter((status) => status === BedStatus.OCCUPIED),
      ).toEqual([BedStatus.OCCUPIED]);
      expect(await bedStatus(winningBedId)).toBe(BedStatus.OCCUPIED);
      await expectOccupancyToBeConsistent();
    });

    it('re-admits the same patient once the first admission is discharged', async () => {
      const beds = await seedBeds(2);
      const patient = await factories.patient(clinicId);

      const first = await admit(patient.id, beds[0].id);
      await discharge(first.id);

      const second = await admit(patient.id, beds[1].id);
      expect(second.id).not.toBe(first.id);
      expect(second.bedId).toBe(beds[1].id);
      await expectOccupancyToBeConsistent();
    });

    it('admits different patients concurrently into different beds', async () => {
      const beds = await seedBeds(8);
      const patients = await Promise.all(
        Array.from({ length: 8 }, () => factories.patient(clinicId)),
      );

      const { winners, losers } = await settleAll(
        patients.map((patient, i) => admit(patient.id, beds[i].id)),
      );

      expect(winners).toHaveLength(8);
      expect(losers).toHaveLength(0);
      await expectOccupancyToBeConsistent();
    });
  });

  describe('a transfer owns the bed the admission still holds', () => {
    it('performs one transition when two transfers race out of the same bed', async () => {
      const beds = await seedBeds(3);
      const patient = await factories.patient(clinicId);
      const admission = await admit(patient.id, beds[0].id);

      const { winners, losers } = await settleAll([
        transfer(admission.id, beds[1].id),
        transfer(admission.id, beds[2].id),
      ]);

      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      for (const loser of losers) {
        expect(loser.reason).toBeInstanceOf(ConflictException);
      }
      await expectOccupancyToBeConsistent();
    });

    it('does not strand the bed a lost transfer had claimed', async () => {
      const beds = await seedBeds(3);
      const patient = await factories.patient(clinicId);
      const admission = await admit(patient.id, beds[0].id);

      const { winners } = await settleAll([
        transfer(admission.id, beds[1].id),
        transfer(admission.id, beds[2].id),
      ]);
      const winner = winners[0] as { value: { bedId: string } };
      const lostTarget = winner.value.bedId === beds[1].id ? beds[2] : beds[1];

      expect(await bedStatus(lostTarget.id)).toBe(BedStatus.AVAILABLE);
      expect(await bedStatus(winner.value.bedId)).toBe(BedStatus.OCCUPIED);
    });

    it('allows a second, sequential transfer to a further bed', async () => {
      const beds = await seedBeds(3);
      const patient = await factories.patient(clinicId);

      const admission = await admit(patient.id, beds[0].id);
      const movedOnce = await transfer(admission.id, beds[1].id);
      expect(movedOnce.bedId).toBe(beds[1].id);

      const movedTwice = await transfer(admission.id, beds[2].id);
      expect(movedTwice.bedId).toBe(beds[2].id);
      expect(await bedStatus(beds[0].id)).toBe(BedStatus.AVAILABLE);
      expect(await bedStatus(beds[1].id)).toBe(BedStatus.AVAILABLE);
      await expectOccupancyToBeConsistent();
    });
  });

  describe('a discharge frees the bed the admission actually holds', () => {
    it('frees the transferred-to bed, not the original one', async () => {
      const beds = await seedBeds(2);
      const patient = await factories.patient(clinicId);
      const admission = await admit(patient.id, beds[0].id);
      await transfer(admission.id, beds[1].id);

      const discharged = await discharge(admission.id);

      expect(discharged.status).toBe(AdmissionStatus.DISCHARGED);
      expect(await bedStatus(beds[0].id)).toBe(BedStatus.AVAILABLE);
      expect(await bedStatus(beds[1].id)).toBe(BedStatus.AVAILABLE);
      await expectOccupancyToBeConsistent();
    });

    it('leaves the moved-into bed free for the next patient', async () => {
      const beds = await seedBeds(2);
      const first = await factories.patient(clinicId);
      const second = await factories.patient(clinicId);

      const admission = await admit(first.id, beds[0].id);
      await transfer(admission.id, beds[1].id);
      await discharge(admission.id);

      const next = await admit(second.id, beds[1].id);
      expect(next.bedId).toBe(beds[1].id);
      await expectOccupancyToBeConsistent();
    });

    it('does not free a bed another patient moved into when the discharge loses the race', async () => {
      const beds = await seedBeds(2);
      const first = await factories.patient(clinicId);
      const second = await factories.patient(clinicId);
      const admission = await admit(first.id, beds[0].id);

      // Hold the interleaving open: inside one transaction, move the patient
      // out of bed 0 and hand bed 0 to somebody else. A discharge that read
      // "ADMITTED, bed 0" before this commits is still ADMITTED afterwards, so
      // a status-only gate lets it through — and it would then free a bed the
      // second patient is sitting in.
      let releaseHold!: () => void;
      const mayCommit = new Promise<void>((resolve) => {
        releaseHold = resolve;
      });
      let held!: () => void;
      const holding = new Promise<void>((resolve) => {
        held = resolve;
      });

      const holder = prisma.$transaction(async (tx) => {
        // A complete, self-consistent move: the patient now occupies bed 1,
        // and bed 0 is handed straight to the next patient.
        await tx.admission.update({
          where: { id: admission.id },
          data: { bedId: beds[1].id },
        });
        await tx.bed.update({
          where: { id: beds[1].id },
          data: { status: BedStatus.OCCUPIED },
        });
        await tx.bed.update({
          where: { id: beds[0].id },
          data: { status: BedStatus.OCCUPIED },
        });
        await tx.admission.create({
          data: { patientId: second.id, bedId: beds[0].id },
        });
        held();
        await mayCommit;
      });
      await holding;

      // The holder stays uncommitted while the discharge runs, so the
      // discharge's own (non-locking) read observes the pre-hold row: still
      // ADMITTED, still in bed 0. Its write then blocks on the row lock the
      // holder is holding and only lands after the commit below.
      const settling = discharge(admission.id);
      await sleep(250);
      releaseHold();
      await holder;

      await expect(settling).rejects.toBeInstanceOf(ConflictException);
      expect(await bedStatus(beds[0].id)).toBe(BedStatus.OCCUPIED);
      expect(await bedStatus(beds[1].id)).toBe(BedStatus.OCCUPIED);
      await expectOccupancyToBeConsistent();
    });
  });
});
