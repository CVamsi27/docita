import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
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

describe('RBAC 403 Verification (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
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
    app.use(cookieParser());
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    jwtService = app.get(JwtService);
    setPrismaInstance(getPrismaInstance());
  });

  beforeEach(async () => {
    await resetDatabase();
    const clinic = await factories.clinic();
    clinicId = clinic.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  const getAuthToken = async (
    role: Role,
    tokenClinicId: string | null = clinicId,
  ) => {
    const userObj = await factories.user({ clinicId: tokenClinicId, role });
    return jwtService.sign({
      sub: userObj.user.id,
      email: userObj.user.email,
      role: userObj.user.role,
      name: userObj.user.name,
      clinicId: userObj.user.clinicId,
    });
  };

  describe('Internal Access', () => {
    it('should allow INTERNAL to access super-admin clinics endpoint', async () => {
      const superAdminToken = await getAuthToken(Role.INTERNAL);

      await request(app.getHttpServer())
        .get('/super-admin/clinics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    it('should return 403 when ADMIN accesses super-admin clinics endpoint', async () => {
      const adminToken = await getAuthToken(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .get('/super-admin/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 when DOCTOR accesses super-admin clinics endpoint', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);

      await request(app.getHttpServer())
        .get('/super-admin/clinics')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('Subscription Billing RBAC', () => {
    it('should return 403 when DOCTOR accesses subscription billing', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);

      await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('should return 403 when RECEPTIONIST accesses subscription billing', async () => {
      const receptionistToken = await getAuthToken(Role.RECEPTIONIST);

      const response = await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(String(response.body.message)).toMatch(
        /forbidden|not authorized|permission/i,
      );
    });

    it('should return 403 when authenticated user has no clinic on clinic-scoped billing endpoint', async () => {
      const noClinicAdminToken = await getAuthToken(Role.ADMIN, null);

      await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${noClinicAdminToken}`)
        .expect(403);
    });
  });

  describe('Clinic Isolation 403', () => {
    it('should return 403 when doctor requests consent history for another clinic', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);
      const otherClinic = await factories.clinic();

      await request(app.getHttpServer())
        .get(`/consent/history?patientId=any&clinicId=${otherClinic.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });
});
