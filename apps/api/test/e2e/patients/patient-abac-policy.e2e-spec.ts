// E2E: ABAC patient policy — additive object-level enforcement on
// GET/PATCH /patients/:id. Existing decorators (roles/feature/tier/tenant)
// stay in force; this suite proves the policy stage does not change the
// effective outcomes on the staff surface and that the pipeline is intact.
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

describe('Patient ABAC policy (e2e)', () => {
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

  const signDoctor = async (clinicId: string) => {
    const { user } = await factories.user({ clinicId, role: Role.DOCTOR });
    await factories.doctorClinic(user.id, clinicId);
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  const signPatient = async (clinicId: string, patientId: string) => {
    const { user } = await factories.user({ clinicId, role: Role.PATIENT });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
      patientId,
    });
    return { user, token };
  };

  it('staff DOCTOR of the owning clinic reads the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('staff DOCTOR of another clinic cannot read the patient (404, no existence disclosure)', async () => {
    const clinicA = await factories.clinic();
    const clinicB = await factories.clinic();
    const { token: tokenA } = await signDoctor(clinicA.id);
    const patientB = await factories.patient(clinicB.id);

    await request(app.getHttpServer())
      .get(`/patients/${patientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await factories.clinic();
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .expect(401);
  });

  it('PATIENT-role token is rejected at the roles gate (403, unchanged)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signPatient(clinicA.id, 'pat-profile-1');
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('staff DOCTOR of the owning clinic updates the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);

    await request(app.getHttpServer())
      .patch(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Updated' })
      .expect(200);
  });
});
