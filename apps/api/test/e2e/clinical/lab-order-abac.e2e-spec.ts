// E2E: C4 — LabOrderAbacPolicy on the object-level lab-order routes (GET
// /clinical/lab-tests/orders/:id, PUT .../orders/:id/status, and the workflow
// routes sample/result/payment/release). Differential-equivalence: LAB and all
// clinical staff are clinic-wide on object routes today (labId scoping exists
// only on the list queue) — C4.1 pins this baseline; assignment pinning and
// payment-state conditions are DEFERRED and must flip in the same commit as
// the decision.
// Routing pin: GET /clinical/lab-tests/queue and /labs must reach
// LabWorkflowController's literal handlers (registered before
// LabTestsController's @Get(':id')), verified below.
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

describe('Lab-order ABAC policy (e2e, C4)', () => {
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

  const makeClinic = () => factories.clinic({ tier: 'ESSENTIAL' });

  const createOrder = async (clinicId: string) => {
    const patient = await factories.patient(clinicId);
    return factories.labTestOrder(patient.id, clinicId);
  };

  it('DOCTOR reads a clinic lab order (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .get(`/clinical/lab-tests/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('LAB role reads any clinic order (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.LAB);
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .get(`/clinical/lab-tests/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('LAB records sample collection on any clinic order (200 — C4.1 baseline pin)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.LAB);
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .put(`/clinical/lab-tests/orders/${order.id}/sample`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'e2e sample' })
      .expect(200);
  });

  it('RECEPTIONIST verifies payment on any clinic order (201 — front-desk payment attribute; LAB is matrix-excluded from payment)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.RECEPTIONIST);
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .post(`/clinical/lab-tests/orders/${order.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'CASH', reference: 'e2e-pay' })
      .expect(201);
  });

  it('NURSE updates an order status (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .put(`/clinical/lab-tests/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SAMPLE_COLLECTED' })
      .expect(200);
  });

  it('staff of another clinic cannot read the order (404, no existence disclosure)', async () => {
    const clinicA = await makeClinic();
    const clinicB = await makeClinic();
    const { token: tokenA } = await signStaff(clinicA.id, Role.LAB);
    const orderB = await createOrder(clinicB.id);

    await request(app.getHttpServer())
      .get(`/clinical/lab-tests/orders/${orderB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unknown order id is a 404', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/clinical/lab-tests/orders/order-does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await makeClinic();
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .get(`/clinical/lab-tests/orders/${order.id}`)
      .expect(401);
  });

  it('PATIENT role is rejected at the roles gate (403 — matrix excludes PATIENT on staff routes)', async () => {
    const clinicA = await makeClinic();
    const patient = await factories.patient(clinicA.id);
    const { user } = await factories.user({
      clinicId: clinicA.id,
      role: Role.PATIENT,
    });
    await prisma.patient.update({
      where: { id: patient.id },
      data: { userId: user.id },
    });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    const order = await createOrder(clinicA.id);

    await request(app.getHttpServer())
      .get(`/clinical/lab-tests/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  describe('literal workflow routes beat the :id shadow (routing pin)', () => {
    // LabWorkflowController's @Get('queue') / @Get('labs') must register
    // before LabTestsController's @Get(':id') on the shared
    // /clinical/lab-tests prefix. If the order regresses, GET
    // /clinical/lab-tests/queue resolves to getTestById with id="queue" and
    // 404s (no test with that id); the literal handlers return a 200 array.
    it('GET /clinical/lab-tests/queue returns the queue list (200 array, not :id 404)', async () => {
      const clinicA = await makeClinic();
      const { token } = await signStaff(clinicA.id, Role.DOCTOR);

      const res = await request(app.getHttpServer())
        .get('/clinical/lab-tests/queue')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /clinical/lab-tests/labs returns the lab directory (200 array, not :id 404)', async () => {
      const clinicA = await makeClinic();
      const { token } = await signStaff(clinicA.id, Role.DOCTOR);

      const res = await request(app.getHttpServer())
        .get('/clinical/lab-tests/labs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
