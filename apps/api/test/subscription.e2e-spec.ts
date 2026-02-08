import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { RazorpaySubscriptionGateway } from '../src/gateways/razorpay-subscription.gateway';
import { mockRazorpayGateway } from './razorpay.provider';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';
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
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();

    // Create clinic and admin user
    const clinic = await factories.clinic({ tier: 'CORE' });
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

  describe('GET /subscription/tiers', () => {
    it('should return all available tiers', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/tiers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate tier structure
      const firstTier = response.body[0];
      expect(firstTier).toHaveProperty('id');
      expect(firstTier).toHaveProperty('name');
    });
  });

  describe('GET /subscription/status', () => {
    it('should return current subscription status', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('tier');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/subscription/status')
        .expect(401);
    });
  });

  describe('GET /subscription/tier-config', () => {
    it('should return tier configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/tier-config')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /subscription/billing/details', () => {
    it('should return billing details for clinic', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/billing/details')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /subscription/billing/preview', () => {
    it('should preview upgrade cost', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscription/billing/preview?tier=PRO&cycle=MONTHLY')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('amountCents');
    });
  });

  describe('POST /subscription/billing/checkout', () => {
    it('should create checkout session for upgrade', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tier: 'PRO',
          billingCycle: 'MONTHLY',
          addOns: [],
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
          tier: 'PRO',
          billingCycle: 'MONTHLY',
        })
        .expect(401);
    });
  });

  describe('POST /subscription/upgrade', () => {
    it('should upgrade tier', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscription/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'PLUS' })
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /subscription/intelligence', () => {
    it('should enable intelligence addon', async () => {
      const response = await request(app.getHttpServer())
        .post('/subscription/intelligence')
        .set('Authorization', `Bearer ${token}`)
        .send({ enabled: true })
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });
});
