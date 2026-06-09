import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from './whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from './payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

function postInvoice(
  server: string,
  authToken: string,
  body: Record<string, unknown>,
) {
  return request(server)
    .post('/invoices')
    .set('Authorization', `Bearer ${authToken}`)
    .set('idempotency-key', randomUUID())
    .send(body);
}

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clinicId: string;
  let patientId: string;

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
    app.use(cookieParser());
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    clearMockPaymentLinkProvider(mockPaymentLinkProvider);

    const clinic = await factories.clinic({ tier: 'PRO' });
    clinicId = clinic.id;

    const { user, plainPassword } = await factories.user({
      clinicId,
      role: 'DOCTOR',
    });

    await factories.doctorClinic(user.id, clinicId);

    const patient = await factories.patient(clinicId);
    patientId = patient.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);

    const accessToken = loginResponse.body.access_token;
    expect(typeof accessToken).toBe('string');
    if (typeof accessToken !== 'string')
      throw new Error('Login did not return access_token');
    expect(accessToken.length).toBeGreaterThan(20);
    token = accessToken;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('GET /invoices', () => {
    it('should list invoices for clinic', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/invoices').expect(401);
    });

    it('still includes paid invoices in the billing ledger', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PAID',
        total: 500,
      }).expect(201);

      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        response.body.items.map((item: { id: string }) => item.id),
      ).toContain(createRes.body.id);
    });
  });

  describe('GET /desk/invoices', () => {
    it('returns only collectible invoices for the selected patient', async () => {
      for (const status of [
        'PENDING',
        'PARTIALLY_PAID',
        'OVERDUE',
        'PAID',
        'CANCELLED',
      ]) {
        await postInvoice(app.getHttpServer(), token, {
          patientId,
          items: [
            { description: `Consultation ${status}`, quantity: 1, price: 500 },
          ],
          status,
          total: 500,
        }).expect(201);
      }

      const response = await request(app.getHttpServer())
        .get(`/desk/invoices?patientId=${patientId}&limit=50`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statuses = response.body.items.map(
        (item: { status: string }) => item.status,
      );
      expect(statuses).toHaveLength(3);
      expect(statuses).toEqual(
        expect.arrayContaining(['PENDING', 'PARTIALLY_PAID', 'OVERDUE']),
      );
      expect(statuses).not.toContain('PAID');
      expect(statuses).not.toContain('CANCELLED');
    });

    it('hides an invoice after desk settlement marks it paid', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id as string;

      const { user: receptionist, plainPassword } = await factories.user({
        clinicId,
        role: 'RECEPTIONIST',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: receptionist.email, password: plainPassword })
        .expect(201);

      const receptionistToken = loginRes.body.access_token as string;

      const beforeSettlement = await request(app.getHttpServer())
        .get(`/desk/invoices?patientId=${patientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        beforeSettlement.body.items.map((item: { id: string }) => item.id),
      ).toContain(invoiceId);

      await request(app.getHttpServer())
        .post(`/desk/invoices/${invoiceId}/settlement`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ paymentMethod: 'CASH', reference: 'RRN-1' })
        .expect(201);

      const afterSettlement = await request(app.getHttpServer())
        .get(`/desk/invoices?patientId=${patientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        afterSettlement.body.items.map((item: { id: string }) => item.id),
      ).not.toContain(invoiceId);
    });
  });

  describe('GET /invoices patient scope (starter tier)', () => {
    let starterToken: string;
    let starterPatientId: string;

    beforeEach(async () => {
      await resetDatabase();

      const clinic = await factories.clinic({ tier: 'CAPTURE' });
      const clinicId = clinic.id;

      const { user, plainPassword } = await factories.user({
        clinicId,
        role: 'DOCTOR',
      });

      await factories.doctorClinic(user.id, clinicId);

      const patient = await factories.patient(clinicId);
      starterPatientId = patient.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: plainPassword })
        .expect(201);

      const accessToken = loginResponse.body.access_token;
      expect(typeof accessToken).toBe('string');
      if (typeof accessToken !== 'string')
        throw new Error('Login did not return access_token');
      starterToken = accessToken;
    });

    it('should return 200 with an empty list when patient exists but clinic lacks invoicing', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices?patientId=${starterPatientId}`)
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
    });

    it('should return 403 for clinic-wide list without invoicing', async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(403);
    });
  });

  describe('POST /invoices', () => {
    it('should create invoice', async () => {
      const invoiceData = {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      };

      const response = await postInvoice(
        app.getHttpServer(),
        token,
        invoiceData,
      ).expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
    });

    it('should validate required fields', async () => {
      await postInvoice(app.getHttpServer(), token, { patientId }).expect(400);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should get invoice details', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(invoiceId);
    });

    it('should return 404 for non-existent invoice', async () => {
      await request(app.getHttpServer())
        .get('/invoices/non_existent_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /invoices/:id/payment-activity', () => {
    it('returns empty items when there are no payment sessions', async () => {
      await prisma.patient.update({
        where: { id: patientId },
        data: { phoneNumber: '' },
      });

      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id as string;

      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}/payment-activity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
    });

    it('includes manual desk settlement in activity', async () => {
      await prisma.patient.update({
        where: { id: patientId },
        data: { phoneNumber: '' },
      });

      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id as string;

      const { user: receptionist, plainPassword } = await factories.user({
        clinicId,
        role: 'RECEPTIONIST',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: receptionist.email, password: plainPassword })
        .expect(201);

      const receptionistToken = loginRes.body.access_token as string;

      await request(app.getHttpServer())
        .post(`/desk/invoices/${invoiceId}/settlement`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ paymentMethod: 'CASH', reference: 'RRN-1' })
        .expect(201);

      const activity = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}/payment-activity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(activity.body.items).toHaveLength(1);
      expect(activity.body.items[0]).toMatchObject({
        provider: 'manual',
        status: 'CAPTURED',
        amountCents: 50000,
        currency: 'INR',
        channel: 'CASH',
        reference: 'RRN-1',
      });
    });
  });

  describe('PATCH /invoices/:id', () => {
    it('should update invoice status', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('POST /desk/invoices/:invoiceId/settlement', () => {
    it('returns 403 for doctor (desk settlement is reception / admin only)', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      await request(app.getHttpServer())
        .post(`/desk/invoices/${createRes.body.id}/settlement`)
        .set('Authorization', `Bearer ${token}`)
        .send({ paymentMethod: 'CASH' })
        .expect(403);
    });

    it('records desk settlement for receptionist', async () => {
      const createRes = await postInvoice(app.getHttpServer(), token, {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'PENDING',
        total: 500,
      }).expect(201);

      const invoiceId = createRes.body.id;

      const { user: receptionist, plainPassword } = await factories.user({
        clinicId,
        role: 'RECEPTIONIST',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: receptionist.email, password: plainPassword })
        .expect(201);

      const receptionistToken = loginRes.body.access_token as string;

      const settleRes = await request(app.getHttpServer())
        .post(`/desk/invoices/${invoiceId}/settlement`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ paymentMethod: 'CASH', reference: 'RRN-1' })
        .expect(201);

      expect(settleRes.body.success).toBe(true);

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(invoice?.status).toBe('PAID');
    });
  });
});
