// E2E: C2 — AppointmentAbacPolicy on the object-level appointment routes
// (GET/PATCH /appointments/:id, PATCH /appointments/:id/cancel|reschedule).
// Differential-equivalence: the ABAC stage must not change any wire outcome
// vs the service-layer access context (doctor-mismatch 403, cross-clinic 404,
// staff 200). The write-lock tightening on completed/no-show appointments is
// DEFERRED (ADR-0013, C2.1) — the staff-updates-COMPLETED case pins that
// baseline so a future flip must change this assertion in the same commit.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppointmentStatus, Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { signE2eAccessToken } from '../../e2e-auth-token';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

describe('Appointment ABAC policy (e2e, C2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .overrideProvider(CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN)
      .useValue(mockPaymentLinkProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    clearMockPaymentLinkProvider(mockPaymentLinkProvider);
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  const signStaff = async (clinicId: string, role: Role) => {
    const { user } = await factories.user({ clinicId, role });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  it('assigned DOCTOR reads their own appointment (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      user.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it("unassigned DOCTOR cannot read another doctor's appointment (403)", async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: otherDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      otherDoctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('NURSE reads any appointment in the clinic (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      doctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('ADMIN reads any appointment in the clinic (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      doctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('staff DOCTOR of another clinic cannot read the appointment (404, no existence disclosure)', async () => {
    const clinicA = await factories.clinic();
    const clinicB = await factories.clinic();
    const { token: tokenA } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: doctorB } = await factories.user({
      clinicId: clinicB.id,
      role: Role.DOCTOR,
    });
    const patientB = await factories.patient(clinicB.id);
    const appointmentB = await factories.appointment(
      patientB.id,
      doctorB.id,
      clinicB.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointmentB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unknown appointment id is a 404', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/appointments/appointment-does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await factories.clinic();
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      doctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .get(`/appointments/${appointment.id}`)
      .expect(401);
  });

  it('assigned DOCTOR updates their own appointment (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      user.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'updated by assigned doctor' })
      .expect(200);
  });

  it("unassigned DOCTOR cannot update another doctor's appointment (403)", async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: otherDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      otherDoctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'should be denied' })
      .expect(403);
  });

  it('NURSE cancels an appointment (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      doctor.id,
      clinicA.id,
    );

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'e2e cancellation' })
      .expect(200);
  });

  it('NURSE updates a COMPLETED appointment (200 — write-lock baseline, DEFERRED C2.1)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const patient = await factories.patient(clinicA.id);
    const appointment = await factories.appointment(
      patient.id,
      doctor.id,
      clinicA.id,
      {
        status: AppointmentStatus.COMPLETED,
      },
    );

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'post-completion edit still allowed today' })
      .expect(200);
  });
});
