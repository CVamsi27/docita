// E2E: C4 — InvoiceAbacPolicy on the object-level invoice routes (GET/PATCH
// /invoices/:id + pdf/payment-activity/claim-readiness/submit-claim + POST
// /whatsapp/approve-invoice/:id). Differential-equivalence: read/update retain
// the matrix roles (any clinical staff, no author pin), tenant discipline 404s
// cross-clinic rows, and approve-invoice stays clinic-wide — the C4.3
// resolution of the C3.1 question (legacy InvoicePolicy has no doctor
// author-of-record branch, unlike prescriptions).
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
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

// The shared mock lacks approveInvoice; extend it locally (same pattern as the
// C3 prescription spec's approvePrescription extension).
const mockWhatsappWithApproval = {
  ...mockWhatsappService,
  approveInvoice: jest.fn().mockResolvedValue({ success: true }),
};

describe('Invoice ABAC policy (e2e, C4)', () => {
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

  // ESSENTIAL tier: the approve route sits under LegacyWhatsappClinicAccess,
  // which requires WHATSAPP_MESSAGING (>= ESSENTIAL).
  const makeClinic = () => factories.clinic({ tier: 'ESSENTIAL' });

  const createInvoice = async (clinicId: string) => {
    const patient = await factories.patient(clinicId);
    return factories.invoice(patient.id);
  };

  it('ADMIN reads any clinic invoice (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DOCTOR (non-author) reads another invoice (200 — no author pin, C4.3)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('RECEPTIONIST reads any clinic invoice (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.RECEPTIONIST);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('staff of another clinic cannot read the invoice (404, no existence disclosure)', async () => {
    const clinicA = await makeClinic();
    const clinicB = await makeClinic();
    const { token: tokenA } = await signStaff(clinicA.id, Role.ADMIN);
    const invoiceB = await createInvoice(clinicB.id);

    await request(app.getHttpServer())
      .get(`/invoices/${invoiceB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unknown invoice id is a 404', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/invoices/invoice-does-not-exist')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await makeClinic();
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.id}`)
      .expect(401);
  });

  it('DOCTOR (non-author) approves another clinic invoice (201 — clinic-wide approve, C4.3)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-invoice/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('ADMIN approves any clinic invoice (201)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .post(`/whatsapp/approve-invoice/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('RECEPTIONIST updates an invoice (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.RECEPTIONIST);
    const invoice = await createInvoice(clinicA.id);

    await request(app.getHttpServer())
      .patch(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PENDING' })
      .expect(200);
  });
});
