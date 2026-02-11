import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ZodValidationPipe } from 'nestjs-zod';
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

describe('Dashboard (e2e)', () => {
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
      .overrideProvider(APP_INTERCEPTOR)
      .useValue({
        intercept: (context: any, next: any) => next.handle(),
      })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        get: () => Promise.resolve(null),
        set: () => Promise.resolve(null),
        del: () => Promise.resolve(null),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // app.useLogger(false); // Enable logger to see errors
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic();
    clinicId = clinic.id;

    const { user, plainPassword } = await factories.user({ clinicId });
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

  describe('GET /dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('totalPatients');
      expect(response.body).toHaveProperty('todayAppointments');
      expect(response.body).toHaveProperty('monthlyRevenue');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/dashboard/stats').expect(401);
    });

    it('should return correct patient count', async () => {
      // Create some patients
      await factories.patient(clinicId);
      await factories.patient(clinicId);
      await factories.patient(clinicId);

      const response = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalPatients).toBeGreaterThanOrEqual(3);
    });
  });
});
