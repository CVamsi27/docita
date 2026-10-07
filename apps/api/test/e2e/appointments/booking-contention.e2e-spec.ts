import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
  captureE2ePressureSnapshot,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/** A calendar date ~6 weeks out (safely future, keeps the runner clock-free). */
function futureCalendarDate(): string {
  return new Date(Date.now() + 42 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * W01 acceptance: "Parallel booking has one winner."
 *
 * `CreateAppointmentUseCase` historically did preflight overlap SELECT then
 * INSERT with no database invariant (Appointment has no unique/exclusion
 * constraint), so concurrent identical or overlapping bookings could all
 * pass the preflight and every one of them landed. These tests race the real
 * `POST /appointments` endpoint against local PostgreSQL.
 */
describe('Booking contention (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;
  let doctorId: string;
  let patientId: string;
  let token: string;

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
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic({ timezone: 'Asia/Kolkata' });
    clinicId = clinic.id;
    const { user, plainPassword } = await factories.user({
      clinicId,
      role: 'DOCTOR',
    });
    doctorId = user.id;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);
    token = loginRes.body.access_token as string;
    const patient = await factories.patient(clinicId);
    patientId = patient.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  function book(startTime: string, endTime: string) {
    return request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId,
        patientId,
        doctorId,
        startTime,
        endTime,
        type: 'consultation',
        status: 'scheduled',
      });
  }

  async function doctorAppointmentCount(): Promise<number> {
    return prisma.appointment.count({ where: { doctorId, clinicId } });
  }

  /**
   * Every loser must be the friendly 400 conflict. This failure has only ever
   * appeared inside a full shard run (where one Jest process has already run a
   * dozen heavy suites), so the assertion carries each loser's response body
   * and the process/DB pressure snapshot: if it ever fires again, the cause is
   * in the failure output instead of needing a long reproduction loop
   * (backlog T-F1).
   */
  async function expectAllLosersToBeConflicts(
    losers: Array<{ status: number; body: unknown }>,
  ) {
    const unexpected = losers.filter((loser) => loser.status !== 400);
    if (unexpected.length === 0) return;

    // Jest takes no message argument and prints only a minimal diff, so the
    // mismatch is raised explicitly to carry each unexpected body and a
    // pressure snapshot (backlog T-F1).
    throw new Error(
      `Raced losers must be 400 conflicts; observed ${JSON.stringify(
        unexpected.map((loser) => ({ status: loser.status, body: loser.body })),
      )} with pressure ${JSON.stringify(await captureE2ePressureSnapshot())}`,
    );
  }

  it('lets exactly one of many parallel identical bookings win', async () => {
    const date = futureCalendarDate();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => book(`${date}T10:00`, `${date}T10:30`)),
    );

    const winners = results.filter((r) => r.status === 201);
    const losers = results.filter((r) => r.status !== 201);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(7);
    await expectAllLosersToBeConflicts(losers);
    expect(await doctorAppointmentCount()).toBe(1);
  });

  it('lets exactly one of two parallel overlapping windows win', async () => {
    const date = futureCalendarDate();
    const results = await Promise.all([
      book(`${date}T10:00`, `${date}T10:30`),
      book(`${date}T10:15`, `${date}T10:45`),
    ]);

    const winners = results.filter((r) => r.status === 201);
    expect(winners).toHaveLength(1);
    expect(results.filter((r) => r.status === 400)).toHaveLength(1);
    await expectAllLosersToBeConflicts(results.filter((r) => r.status !== 201));
    expect(await doctorAppointmentCount()).toBe(1);
  });

  it('keeps ordinary sequential bookings working (no false conflicts)', async () => {
    const date = futureCalendarDate();

    const first = await book(`${date}T09:00`, `${date}T09:30`);
    expect(first.status).toBe(201);

    const second = await book(`${date}T10:00`, `${date}T10:30`);
    expect(second.status).toBe(201);

    expect(await doctorAppointmentCount()).toBe(2);
  });
});
