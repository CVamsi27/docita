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
import { ConsentType, ConsentStatus } from '@workspace/db';

describe('Compliance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clinicId: string;
  let doctorId: string;
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

    try {
      const clinic = await factories.clinic();
      clinicId = clinic.id;

      const { user, plainPassword } = await factories.user({ clinicId });
      doctorId = user.id;

      await factories.doctorClinic(doctorId, clinicId);

      const patient = await factories.patient(clinicId);
      patientId = patient.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        });

      token = loginResponse.body.access_token;
    } catch (error) {
      throw error;
    }
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('POST /consent', () => {
    it('should record new consent', async () => {
      const response = await request(app.getHttpServer())
        .post('/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          clinicId,
          consentType: ConsentType.HIPAA_RELEASE,
          status: ConsentStatus.ACTIVE,
          grantedAt: new Date(),
          expiresAt: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          ),
          notes: 'WhatsApp communication enabled',
          purpose: 'General Consent',
          givenBy: 'Patient via Form',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
      expect(response.body.consentType).toBe(ConsentType.HIPAA_RELEASE);
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
        })
        .expect(400);
    });
  });

  describe('GET /consent/history', () => {
    it('should retrieve consent history', async () => {
      await request(app.getHttpServer())
        .post('/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          clinicId,
          consentType: ConsentType.HIPAA_RELEASE,
          status: ConsentStatus.ACTIVE,
          purpose: 'WhatsApp Communication',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/consent/history?patientId=${patientId}&clinicId=${clinicId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].consentType).toBe(ConsentType.HIPAA_RELEASE);
    });
  });

  describe('POST /consent/:id/withdraw', () => {
    it('should withdraw existing consent', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          clinicId,
          consentType: ConsentType.TREATMENT,
          status: ConsentStatus.ACTIVE,
          purpose: 'General Treatment',
        })
        .expect(201);

      const consentId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .post(`/consent/${consentId}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Patient request',
          withdrawnBy: 'Admin',
          withdrawnAt: new Date(),
          status: ConsentStatus.REVOKED,
        })
        .expect(201);

      expect(response.body.status).toBe(ConsentStatus.REVOKED);

      const historyRes = await request(app.getHttpServer())
        .get(`/consent/history?patientId=${patientId}&clinicId=${clinicId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const updatedRecord = historyRes.body.find(
        (c: { id: string }) => c.id === consentId,
      );
      expect(updatedRecord.status).toBe(ConsentStatus.REVOKED);
    });
  });
});
