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
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { expectMatchesSchema } from '../../contract-assertions';
import { listAppointmentsResponseSchema } from '@workspace/types';

/**
 * Reference conversion of a wall-clock `YYYY-MM-DDTHH:mm` value to the UTC
 * instant it denotes in the given IANA timezone. Independent of the API's
 * `normalizeAppointmentInstant` (same well-known Intl-based two-pass DST
 * correction) so the e2e can assert persisted values against a fixed oracle
 * for whatever future date the run uses.
 */
function wallClockToUtcIso(wallDateTime: string, timeZone: string): string {
  const [, year, month, day, hour, minute] = (
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallDateTime) ?? []
  ).map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error(`Invalid wall datetime: ${wallDateTime}`);
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (instant: Date): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(instant);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    const asUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    return asUtc - instant.getTime();
  };

  const firstOffset = offsetAt(new Date(utcGuess));
  const corrected = new Date(utcGuess - firstOffset);
  return new Date(utcGuess - offsetAt(corrected)).toISOString();
}

/** A calendar date ~6 weeks out (safely future, keeps the runner clock-free). */
function futureCalendarDate(): string {
  return new Date(Date.now() + 42 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * P4.3 — appointment timezone conversion (clinic-wall input -> UTC instant).
 *
 * Covers the API-level contract that a wall-clock `YYYY-MM-DDTHH:mm` value is
 * interpreted in the clinic's timezone (not the server's) and persisted as the
 * correct UTC instant, and that an explicit UTC ISO instant passes through
 * unchanged. Mirrors the AGENTS.md 3.3.1 datetime contract.
 */
describe('Appointment timezone conversion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  const createClinicDoctorPatient = async (timezone: string) => {
    const clinic = await factories.clinic({ timezone });
    const { user, plainPassword } = await factories.user({
      clinicId: clinic.id,
      role: 'DOCTOR',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);
    const patient = await factories.patient(clinic.id);
    return {
      clinic,
      doctorId: user.id,
      patientId: patient.id,
      token: loginRes.body.access_token as string,
    };
  };

  const createAppointment = async (
    token: string,
    payload: {
      clinicId: string;
      patientId: string;
      doctorId: string;
      startTime: string;
      endTime: string;
    },
  ) => {
    return request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, type: 'consultation', status: 'scheduled' })
      .expect(201);
  };

  it('interprets a wall-clock time in the clinic timezone (Asia/Kolkata, UTC+5:30)', async () => {
    const { clinic, doctorId, patientId, token } =
      await createClinicDoctorPatient('Asia/Kolkata');

    const date = futureCalendarDate();
    const startWall = `${date}T10:00`;
    const endWall = `${date}T10:30`;

    const response = await createAppointment(token, {
      clinicId: clinic.id,
      patientId,
      doctorId,
      startTime: startWall,
      endTime: endWall,
    });

    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(stored.startTime.toISOString()).toBe(
      wallClockToUtcIso(startWall, 'Asia/Kolkata'),
    );
    expect(stored.endTime.toISOString()).toBe(
      wallClockToUtcIso(endWall, 'Asia/Kolkata'),
    );
  });

  it('interprets a wall-clock time in a second clinic timezone (America/New_York)', async () => {
    const { clinic, doctorId, patientId, token } =
      await createClinicDoctorPatient('America/New_York');

    const date = futureCalendarDate();
    const startWall = `${date}T10:00`;
    const endWall = `${date}T10:30`;

    const response = await createAppointment(token, {
      clinicId: clinic.id,
      patientId,
      doctorId,
      startTime: startWall,
      endTime: endWall,
    });

    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(stored.startTime.toISOString()).toBe(
      wallClockToUtcIso(startWall, 'America/New_York'),
    );
    expect(stored.endTime.toISOString()).toBe(
      wallClockToUtcIso(endWall, 'America/New_York'),
    );
  });

  it('passes an explicit UTC ISO instant through unchanged regardless of clinic timezone', async () => {
    const { clinic, doctorId, patientId, token } =
      await createClinicDoctorPatient('America/New_York');

    const startIso = new Date(
      Date.now() + 43 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const endIso = new Date(
      new Date(startIso).getTime() + 30 * 60 * 1000,
    ).toISOString();

    const response = await createAppointment(token, {
      clinicId: clinic.id,
      patientId,
      doctorId,
      startTime: startIso,
      endTime: endIso,
    });

    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(stored.startTime.toISOString()).toBe(startIso);
    expect(stored.endTime.toISOString()).toBe(endIso);
  });

  it('round-trips the converted instants through the list endpoint under the shared Zod contract', async () => {
    const { clinic, doctorId, patientId, token } =
      await createClinicDoctorPatient('Asia/Kolkata');

    const date = futureCalendarDate();
    const startWall = `${date}T10:00`;
    const endWall = `${date}T10:30`;
    const expectedStartIso = wallClockToUtcIso(startWall, 'Asia/Kolkata');

    await createAppointment(token, {
      clinicId: clinic.id,
      patientId,
      doctorId,
      startTime: startWall,
      endTime: endWall,
    });

    const response = await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const parsed = expectMatchesSchema(
      listAppointmentsResponseSchema,
      response.body,
    );
    expect(parsed.items.length).toBeGreaterThanOrEqual(1);

    const listed = parsed.items.find(
      (item) => item.patientId === patientId && item.doctorId === doctorId,
    );
    expect(listed).toBeDefined();
    expect(new Date(listed!.startTime as string).toISOString()).toBe(
      expectedStartIso,
    );
  });
});
