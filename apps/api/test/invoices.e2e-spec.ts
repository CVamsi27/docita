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
import { RazorpaySubscriptionGateway } from '@/gateways/razorpay-subscription.gateway';
import { mockRazorpayGateway } from './razorpay.provider';
import { WhatsappService } from '@/shared/modules/messaging/whatsapp/whatsapp.service';
import { mockWhatsappService } from './whatsapp.provider';

describe.skip('Invoices (e2e)', () => {
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
      .overrideProvider(RazorpaySubscriptionGateway)
      .useValue(mockRazorpayGateway)
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
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
      .send({ email: user.email, password: plainPassword });

    token = loginResponse.body.access_token;
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
  });

  describe('POST /invoices', () => {
    it('should create invoice', async () => {
      const invoiceData = {
        patientId,
        items: [{ description: 'Consultation', quantity: 1, price: 500 }],
        status: 'DRAFT',
        total: 500,
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId })
        .expect(400);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should get invoice details', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          items: [{ description: 'Consultation', quantity: 1, price: 500 }],
          status: 'DRAFT',
          total: 500,
        });

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

  describe('PATCH /invoices/:id', () => {
    it('should update invoice status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          items: [{ description: 'Consultation', quantity: 1, price: 500 }],
          status: 'DRAFT',
          total: 500,
        });

      const invoiceId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'SENT' })
        .expect(200);

      expect(response.body.status).toBe('SENT');
    });
  });
});
