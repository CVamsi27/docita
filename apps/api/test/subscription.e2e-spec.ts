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

    const clinic = await factories.clinic({ tier: 'ESSENTIAL' });
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

      expect(response.body).toBeDefined();
      expect(response.body).toEqual({});
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
});
