import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { PAYMENT_GATEWAY_TOKEN } from '@/domains/subscriptions/application/ports';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

const mockPaymentGateway = {
  createCustomer: jest.fn().mockResolvedValue('cust_1234567890'),
  updateCustomer: jest.fn().mockResolvedValue(undefined),
  createOrder: jest
    .fn()
    .mockImplementation(
      async (request: { amountCents: number; currency: string }) => ({
        razorpayOrderId: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        amountCents: request.amountCents,
        currency: request.currency,
      }),
    ),
  verifyPayment: jest
    .fn()
    .mockImplementation(
      async (request: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
      }) => ({
        verified: true,
        paymentId: request.razorpayPaymentId,
        orderId: request.razorpayOrderId,
        amountCents: 10000,
      }),
    ),
  createSubscription: jest.fn().mockResolvedValue({
    subscriptionId: 'sub_1234567890',
  }),
  cancelSubscription: jest.fn().mockResolvedValue(undefined),
  refundPayment: jest.fn().mockResolvedValue(undefined),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
};

describe('Subscription (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clinicId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(PAYMENT_GATEWAY_TOKEN)
      .useValue(mockPaymentGateway)
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

    const clinic = await factories.clinic({
      tier: 'ESSENTIAL',
      settings: { gstin: '29AABCU9603R1ZX' },
    });
    clinicId = clinic.id;

    const { user, plainPassword } = await factories.user({
      clinicId,
      role: 'ADMIN',
    });

    await factories.doctorClinic(user.id, clinicId);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword });

    token = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('GET /subscription/config', () => {
    it('should return all available tiers', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/config')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.tiers)).toBe(true);
      expect(response.body.tiers.length).toBeGreaterThan(0);

      const firstTier = response.body.tiers[0];
      expect(firstTier).toHaveProperty('id');
      expect(firstTier).toHaveProperty('name');
    });
  });

  describe('GET /subscription/current', () => {
    it('should return current subscription status', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as unknown;
      const hasNoActiveSubscription =
        body === null ||
        (typeof body === 'object' &&
          body !== null &&
          !Array.isArray(body) &&
          Object.keys(body as Record<string, unknown>).length === 0);

      expect(hasNoActiveSubscription).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/subscription/current')
        .expect(401);
    });
  });

  describe('GET /subscription/config', () => {
    it('should return tier configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/config')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /subscription/billing', () => {
    it('should return billing details for clinic', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /subscription/billing/preview', () => {
    it('should preview upgrade cost', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/billing/preview?tier=PROFESSIONAL&cycle=MONTHLY')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();

      if (response.body.isNewSubscription) {
        expect(response.body).toHaveProperty('priceCents');
      } else {
        expect(response.body).toHaveProperty('chargeCents');
      }
    });
  });

  describe('POST /subscription/billing/checkout', () => {
    it('should create checkout session for upgrade', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tier: 'PROFESSIONAL',
          billingCycle: 'MONTHLY',
        })
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('amountCents');
      expect(response.body).toHaveProperty('razorpayKeyId');
    });

    it('should reject invalid tier', async () => {
      await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tier: 'INVALID_TIER',
          billingCycle: 'MONTHLY',
        })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .send({
          tier: 'PROFESSIONAL',
          billingCycle: 'MONTHLY',
        })
        .expect(401);
    });
  });

  describe('POST /subscription/activate-legacy', () => {
    it('should create a subscription from a legacy upgrade request', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscription/activate-legacy')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'ESSENTIAL', cycle: 'MONTHLY' })
        .expect(201);

      expect(response.body).toHaveProperty('subscriptionId');
    });
  });

  describe('POST /subscription/billing/activate', () => {
    it('anchors a lapsed same-plan renewal from the day after the previous period ended', async () => {
      await request(app.getHttpServer())
        .post('/subscription/activate-legacy')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'ESSENTIAL', cycle: 'MONTHLY' })
        .expect(201);

      const checkout = await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tier: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
        })
        .expect(201);

      const orderId = checkout.body.orderId as string;
      const amountCents = checkout.body.amountCents as number;
      expect(orderId).toBeTruthy();
      expect(amountCents).toBeGreaterThan(0);

      const periodEnd = new Date();
      periodEnd.setUTCDate(periodEnd.getUTCDate() - 5);
      periodEnd.setUTCHours(23, 59, 59, 999);

      const periodStart = new Date(periodEnd);
      periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
      periodStart.setUTCHours(0, 0, 0, 0);

      const expectedPeriodStart = new Date(periodEnd);
      expectedPeriodStart.setUTCDate(expectedPeriodStart.getUTCDate() + 1);
      expectedPeriodStart.setUTCHours(0, 0, 0, 0);

      await prisma.subscription.update({
        where: { clinicId },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          plan: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
        },
      });

      mockPaymentGateway.verifyPayment.mockResolvedValueOnce({
        verified: true,
        paymentId: 'pay_lapsed_e2e',
        orderId,
        amountCents,
      });

      await request(app.getHttpServer())
        .post('/subscription/billing/activate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          razorpayPaymentId: 'pay_lapsed_e2e',
          razorpayOrderId: orderId,
          razorpaySignature: 'sig_test',
          tier: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
        })
        .expect(201);

      const current = await request(app.getHttpServer())
        .get('/subscription/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(current.body).toMatchObject({
        tier: 'ESSENTIAL',
        billingCycle: 'MONTHLY',
        subscriptionStatus: 'ACTIVE',
      });
      expect(new Date(current.body.currentPeriodStart).toISOString()).toBe(
        expectedPeriodStart.toISOString(),
      );
      expect(new Date(current.body.currentPeriodEnd).getTime()).toBeGreaterThan(
        expectedPeriodStart.getTime(),
      );
    });
  });
});
