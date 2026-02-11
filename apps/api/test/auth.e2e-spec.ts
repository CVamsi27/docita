import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    // Disable logging in tests to suppress expected error messages
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new doctor', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newdoctor@test.com',
          password: 'Test@123456',
          firstName: 'Dr.',
          lastName: 'Smith',
          clinicName: 'Test Clinic',
        })
        .expect(201);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBe('newdoctor@test.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      const { user } = await factories.user({ email: 'exists@test.com' });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: user.email,
          password: 'Test@123456',
          firstName: 'Dr.',
          lastName: 'Duplicate',
          clinicName: 'Duplicate Clinic',
        })
        .expect(409);

      expect(response.body.message).toMatch(/already exists|duplicate/i);
    });

    it('should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          firstName: 'Dr.',
          lastName: 'Test',
          clinicName: 'Weak Password Clinic',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const { user, plainPassword } = await factories.user();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(201);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      const { user } = await factories.user();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid|incorrect|unauthorized/i);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test@123456',
        })
        .expect(401);

      expect(response.body.message).toMatch(/invalid|not found|unauthorized/i);
    });
  });
});
