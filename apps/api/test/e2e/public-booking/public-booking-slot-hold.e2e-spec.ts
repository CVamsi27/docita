import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppointmentRequestStatus, Role } from '@workspace/db';
import type { PatientAppointmentRequestCreate } from '@workspace/types';
import { fromLocalISOString } from '@workspace/utils';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { AppointmentRequestCommandService } from '@/domains/appointments/application/services/appointment-request-command.service';
import {
  PUBLIC_BOOKING_JWT_PURPOSE,
  PublicBookingTokenService,
} from '@/domains/public-booking/application/services/public-booking-token.service';
import { getDayOfWeekInClinicZone } from '@/domains/doctors/application/services/slot-generation-helpers';
import { mockWhatsappService } from '../../whatsapp.provider';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * P02 — public booking is a candidate, and the final booking is authorized.
 *
 * The unit suites prove the slot hold and the review claim in isolation. This
 * suite proves the same invariants against Postgres, where the actual unique
 * index lives, and against the HTTP routes a patient calls:
 *
 *   1. a public submission files a PENDING request and books nothing;
 *   2. a retried or concurrent identical submission returns one request;
 *   3. another patient's request for the same slot is not visible or blocked;
 *   4. two concurrent clinic approvals produce exactly one appointment;
 *   5. a review frees the hold, so the patient can ask again;
 *   6. the public doctor list is scoped and excludes departed/deleted doctors.
 */
describe('Public booking slot hold and final-booking conflicts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bookingTokens: PublicBookingTokenService;
  let requestService: AppointmentRequestService;
  let requestCommand: AppointmentRequestCommandService;

  const CLINIC_TIMEZONE = 'Asia/Kolkata';
  const REFERRAL_CODE = 'P02BOOK';
  const OTHER_REFERRAL_CODE = 'P02OTHER';
  const SLOT_START_LOCAL = '09:30';
  const SLOT_END_LOCAL = '10:00';
  const DOCTOR_PHONE = '+919876500001';
  const OTHER_PATIENT_PHONE = '+919876500002';

  let slotDate: string;
  let slotStartIso: string;
  let slotEndIso: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      // Turnstile is an external challenge; the abuse controls under test are
      // the slot hold and the clinic's review, not the widget round-trip.
      .overrideProvider(TurnstileVerifyService)
      .useValue({ verifyToken: jest.fn(async () => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    bookingTokens = moduleFixture.get(PublicBookingTokenService);
    requestService = moduleFixture.get(AppointmentRequestService);
    requestCommand = moduleFixture.get(AppointmentRequestCommandService);
    setPrismaInstance(prisma);

    // The clinic has no weekly-schedule rows, so slot generation falls back to
    // the implicit Monday-Friday 09:00-17:00 hours. Pick a weekday far enough
    // out that no appointment or time-off can make the slot busy.
    const cursor = new Date();
    cursor.setUTCDate(cursor.getUTCDate() + 30);
    let candidate = cursor.toISOString().slice(0, 10);
    for (let i = 0; i < 14; i += 1) {
      const day = getDayOfWeekInClinicZone(candidate, CLINIC_TIMEZONE);
      if (day !== 'SATURDAY' && day !== 'SUNDAY') break;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      candidate = cursor.toISOString().slice(0, 10);
    }
    const slotStart = fromLocalISOString(`${candidate}T${SLOT_START_LOCAL}`, {
      timezone: CLINIC_TIMEZONE,
    });
    const slotEnd = fromLocalISOString(`${candidate}T${SLOT_END_LOCAL}`, {
      timezone: CLINIC_TIMEZONE,
    });
    if (!slotStart || !slotEnd)
      throw new Error('Could not build the booking slot instants');
    slotDate = candidate;
    slotStartIso = slotStart.toISOString();
    slotEndIso = slotEnd.toISOString();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  const seedClinic = (referralCode = REFERRAL_CODE) =>
    factories.clinic({ referralCode, timezone: CLINIC_TIMEZONE });

  /** A doctor whose primary clinic is this one. */
  const seedDoctor = async (clinicId: string, name = 'Dr. Bookable') => {
    const { user } = await factories.user({
      clinicId,
      role: Role.DOCTOR,
      name,
      specialization: 'GENERAL_PRACTICE',
    });
    return user.id;
  };

  /** A doctor reachable only through a DoctorClinic link of the given state. */
  const seedLinkedDoctor = async (
    clinicId: string,
    active: boolean,
    name: string,
  ) => {
    const { user } = await factories.user({
      clinicId: null,
      role: Role.DOCTOR,
      name,
      specialization: 'GENERAL_PRACTICE',
    });
    await prisma.doctorClinic.create({
      data: { doctorId: user.id, clinicId, role: 'doctor', active },
    });
    return user.id;
  };

  const seedPatient = async (clinicId: string, phoneNumber: string) => {
    const patient = await factories.patient(clinicId, { phoneNumber });
    const token = bookingTokens.sign({
      purpose: PUBLIC_BOOKING_JWT_PURPOSE,
      clinicId,
      patientId: patient.id,
      phoneNumber,
    });
    return { patientId: patient.id, token };
  };

  const submitBody = (
    phoneNumber: string,
    doctorId: string,
    token: string,
  ) => ({
    phoneNumber,
    firstName: 'Ada',
    lastName: 'Lovelace',
    preferredDoctorId: doctorId,
    slotCalendarDate: slotDate,
    requestedSlotStart: slotStartIso,
    requestedSlotEnd: slotEndIso,
    reason: 'Fever',
    bookingVerificationToken: token,
  });

  const submitRequest = (referralCode: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`/public/booking/clinics/${referralCode}/requests`)
      .send(body);

  const requestInput = (
    preferredDoctorId: string,
  ): PatientAppointmentRequestCreate => ({
    preferredDoctorId,
    preferredDate: slotDate,
    requestedSlotStart: slotStartIso,
    requestedSlotEnd: slotEndIso,
    reason: 'Fever',
  });

  const requestsFor = (clinicId: string) =>
    prisma.appointmentRequest.findMany({ where: { clinicId } });

  it('files a PENDING request and books nothing until the clinic approves', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const { patientId, token } = await seedPatient(clinic.id, DOCTOR_PHONE);

    const res = await submitRequest(
      REFERRAL_CODE,
      submitBody(DOCTOR_PHONE, doctorId, token),
    ).expect(201);

    const rows = await requestsFor(clinic.id);
    expect(rows).toHaveLength(1);
    const held = rows[0];
    expect(held?.id).toBe(res.body.requestId);
    expect(held?.patientId).toBe(patientId);
    expect(held?.status).toBe(AppointmentRequestStatus.PENDING);
    expect(held?.pendingSlotKey).not.toBeNull();
    expect(
      await prisma.appointment.count({ where: { clinicId: clinic.id } }),
    ).toBe(0);
  });

  it('returns the same request when the same patient retries the same slot', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const { token } = await seedPatient(clinic.id, DOCTOR_PHONE);

    const first = await submitRequest(
      REFERRAL_CODE,
      submitBody(DOCTOR_PHONE, doctorId, token),
    ).expect(201);
    const second = await submitRequest(
      REFERRAL_CODE,
      submitBody(DOCTOR_PHONE, doctorId, token),
    ).expect(201);

    expect(second.body.requestId).toBe(first.body.requestId);
    expect(await requestsFor(clinic.id)).toHaveLength(1);
  });

  it('lets another patient request the same slot without exposing the first request', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const first = await seedPatient(clinic.id, DOCTOR_PHONE);
    const second = await seedPatient(clinic.id, OTHER_PATIENT_PHONE);

    const firstResponse = await submitRequest(
      REFERRAL_CODE,
      submitBody(DOCTOR_PHONE, doctorId, first.token),
    ).expect(201);
    const secondResponse = await submitRequest(
      REFERRAL_CODE,
      submitBody(OTHER_PATIENT_PHONE, doctorId, second.token),
    ).expect(201);

    expect(secondResponse.body.requestId).not.toBe(
      firstResponse.body.requestId,
    );
    const rows = await requestsFor(clinic.id);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.pendingSlotKey)).size).toBe(2);
  });

  it('resolves concurrent identical submissions to a single held request', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const { patientId } = await seedPatient(clinic.id, DOCTOR_PHONE);
    const input = requestInput(doctorId);

    const [first, second] = await Promise.all([
      requestService.createPatientRequest(patientId, clinic.id, input),
      requestService.createPatientRequest(patientId, clinic.id, input),
    ]);

    expect(first.id).toBe(second.id);
    const rows = await requestsFor(clinic.id);
    expect(rows).toHaveLength(1);
    expect(
      await prisma.appointment.count({ where: { clinicId: clinic.id } }),
    ).toBe(0);
  });

  it('books exactly one appointment when two reviewers approve concurrently', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const { patientId } = await seedPatient(clinic.id, DOCTOR_PHONE);
    const created = await requestService.createPatientRequest(
      patientId,
      clinic.id,
      requestInput(doctorId),
    );
    const approval = {
      doctorId,
      startTime: slotStartIso,
      endTime: slotEndIso,
    };

    const results = await Promise.allSettled([
      requestCommand.approveRequest(created.id, clinic.id, doctorId, approval),
      requestCommand.approveRequest(created.id, clinic.id, doctorId, approval),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.appointment.count({ where: { clinicId: clinic.id } }),
    ).toBe(1);
    const settled = await prisma.appointmentRequest.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(settled.status).toBe(AppointmentRequestStatus.APPROVED);
    expect(settled.pendingSlotKey).toBeNull();
  });

  it('frees the hold when a review settles the request, so the patient can ask again', async () => {
    const clinic = await seedClinic();
    const doctorId = await seedDoctor(clinic.id);
    const { patientId } = await seedPatient(clinic.id, DOCTOR_PHONE);
    const input = requestInput(doctorId);

    const rejected = await requestService.createPatientRequest(
      patientId,
      clinic.id,
      input,
    );
    await requestCommand.rejectRequest(rejected.id, clinic.id, doctorId, {
      responseMessage: 'No slots this week',
    });

    const refiled = await requestService.createPatientRequest(
      patientId,
      clinic.id,
      input,
    );

    expect(refiled.id).not.toBe(rejected.id);
    const rows = await requestsFor(clinic.id);
    expect(rows).toHaveLength(2);
    const reviewedRow = rows.find((r) => r.id === rejected.id);
    expect(reviewedRow?.status).toBe(AppointmentRequestStatus.REJECTED);
    expect(reviewedRow?.pendingSlotKey).toBeNull();
  });

  it('lists only doctors still working at the clinic, with a scoped payload', async () => {
    const clinic = await seedClinic();
    const otherClinic = await seedClinic(OTHER_REFERRAL_CODE);
    const activeDoctorId = await seedDoctor(clinic.id, 'Dr. Active');
    const departedDoctorId = await seedLinkedDoctor(
      clinic.id,
      false,
      'Dr. Departed',
    );
    const { user: deletedDoctor } = await factories.user({
      clinicId: clinic.id,
      role: Role.DOCTOR,
      name: 'Dr. Deleted',
      deletedAt: new Date(),
    });
    const otherClinicDoctorId = await seedDoctor(
      otherClinic.id,
      'Dr. Elsewhere',
    );

    const res = await request(app.getHttpServer())
      .get(`/public/booking/clinics/${REFERRAL_CODE}/doctors`)
      .expect(200);

    const ids = res.body.doctors.map((d: { id: string }) => d.id);
    expect(ids).toContain(activeDoctorId);
    expect(ids).not.toContain(departedDoctorId);
    expect(ids).not.toContain(deletedDoctor.id);
    expect(ids).not.toContain(otherClinicDoctorId);

    const activeCard = res.body.doctors.find(
      (d: { id: string }) => d.id === activeDoctorId,
    );
    expect(Object.keys(activeCard).sort()).toEqual([
      'id',
      'name',
      'specialization',
    ]);
  });

  it('refuses to hold a slot for a soft-deleted doctor', async () => {
    const clinic = await seedClinic();
    const { user: deletedDoctor } = await factories.user({
      clinicId: clinic.id,
      role: Role.DOCTOR,
      name: 'Dr. Deleted',
      deletedAt: new Date(),
    });
    const { patientId } = await seedPatient(clinic.id, DOCTOR_PHONE);

    await expect(
      requestService.createPatientRequest(
        patientId,
        clinic.id,
        requestInput(deletedDoctor.id),
      ),
    ).rejects.toThrow('Selected doctor is not available here');
    expect(await requestsFor(clinic.id)).toHaveLength(0);
  });

  it('rejects slot probes for a doctor outside the clinic', async () => {
    const clinic = await seedClinic();
    await seedDoctor(clinic.id, 'Dr. Active');
    const otherClinic = await seedClinic(OTHER_REFERRAL_CODE);
    const otherDoctorId = await seedDoctor(otherClinic.id, 'Dr. Elsewhere');
    const departedDoctorId = await seedLinkedDoctor(
      clinic.id,
      false,
      'Dr. Departed',
    );

    for (const doctorId of [otherDoctorId, departedDoctorId]) {
      await request(app.getHttpServer())
        .get(`/public/booking/clinics/${REFERRAL_CODE}/slots`)
        .query({ doctorId, date: slotDate })
        .expect(400);
    }

    await request(app.getHttpServer())
      .get(`/public/booking/clinics/${REFERRAL_CODE}/slots`)
      .query({ doctorId: 'any', date: slotDate })
      .expect(200);
  });
});
