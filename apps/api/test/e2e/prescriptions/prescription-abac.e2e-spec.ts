// E2E: C3 — PrescriptionAbacPolicy on the object-level prescription routes
// (GET /prescriptions/:id, POST /whatsapp/approve-prescription/:id).
// Differential-equivalence: read retains the matrix roles (non-author DOCTOR
// reads any clinic prescription), tenant discipline 404s cross-clinic rows,
// and the approve route ("sign", enforced as update) is author-of-record — a
// recorded tightening (ADR-0013, C3): a plain DOCTOR must be the author, while
// ADMIN/ADMIN_DOCTOR keep clinic-wide approve per the legacy policy.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
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
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

// The shared mock lacks approvePrescription (approval flow is out of its
// surface); extend it locally so the 200-path approve assertions exercise the
// real controller → policy → facade chain. approve-invoice stays untouched
// (C4 scope).
const mockWhatsappWithApproval = {
  ...mockWhatsappService,
  approvePrescription: jest.fn().mockResolvedValue({ success: true }),
};

describe('Prescription ABAC policy (e2e, C3)', () => {
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
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappWithApproval)
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

  const createPrescription = async (clinicId: string, doctorId: string) => {
    const patient = await factories.patient(clinicId);
    const appointment = await factories.appointment(
      patient.id,
      doctorId,
      clinicId,
    );
    return factories.prescription(appointment.id, patient.id, doctorId);
  };

  // ESSENTIAL tier: the approve route sits under LegacyWhatsappClinicAccess,
  // which requires WHATSAPP_MESSAGING (>= ESSENTIAL); the STARTER default
  // would 403 at the feature gate before the policy stage.
  const makeClinic = () => factories.clinic({ tier: 'ESSENTIAL' });

  it('author DOCTOR reads their own prescription (200)', async () => {
    const clinicA = await makeClinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const prescription = await createPrescription(clinicA.id, user.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it("non-author DOCTOR reads another doctor's prescription (200 — read retains matrix roles)", async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: authorDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, authorDoctor.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('NURSE reads any clinic prescription (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, doctor.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('ADMIN reads any clinic prescription (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, doctor.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('staff DOCTOR of another clinic cannot read the prescription (404, no existence disclosure)', async () => {
    const clinicA = await makeClinic();
    const clinicB = await makeClinic();
    const { token: tokenA } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: doctorB } = await factories.user({
      clinicId: clinicB.id,
      role: Role.DOCTOR,
    });
    const prescriptionB = await createPrescription(clinicB.id, doctorB.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescriptionB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unknown prescription id is a 404', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/prescriptions/prescription-does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await makeClinic();
    const { user: doctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, doctor.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .expect(401);
  });

  it("non-author DOCTOR cannot approve another doctor's prescription (403 — C3 author-of-record)", async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const { user: authorDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, authorDoctor.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('author DOCTOR approves their own prescription (201)', async () => {
    const clinicA = await makeClinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const prescription = await createPrescription(clinicA.id, user.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('ADMIN approves any clinic prescription (201 — staff bypass survives the pin)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);
    const { user: authorDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, authorDoctor.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('ADMIN_DOCTOR approves any clinic prescription (201 — staff bypass survives the pin)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN_DOCTOR);
    const { user: authorDoctor } = await factories.user({
      clinicId: clinicA.id,
      role: Role.DOCTOR,
    });
    const prescription = await createPrescription(clinicA.id, authorDoctor.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });
});
