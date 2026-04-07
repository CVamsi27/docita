import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { Role } from '@workspace/db';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';

describe('RBAC Enforcement (e2e)', () => {
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
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    app.useLogger(false);
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

  describe('Internal Endpoints', () => {
    it('should block non-INTERNAL (e.g., ADMIN) from internal endpoints', async () => {
      const adminToken = await getAuthToken(Role.ADMIN);
      await request(app.getHttpServer())
        .get('/internal/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should allow INTERNAL to access internal endpoints', async () => {
      const internalToken = await getAuthToken(Role.INTERNAL);
      await request(app.getHttpServer())
        .get('/internal/clinics')
        .set('Authorization', `Bearer ${internalToken}`)
        .expect(200);
    });
  });

  describe('Consent Endpoints (Doctor/Admin Only)', () => {
    it('should allow DOCTOR to access consent history', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);
      await request(app.getHttpServer())
        .get(`/consent/history?patientId=any&clinicId=${clinicId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);
    });

    it('should block RECEPTIONIST from accessing consent history', async () => {
      const receptionistToken = await getAuthToken(Role.RECEPTIONIST);
      await request(app.getHttpServer())
        .get(`/consent/history?patientId=any&clinicId=${clinicId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);
    });

    it('should block clinic-id mismatch even for authorized role', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);
      const otherClinic = await factories.clinic();

      await request(app.getHttpServer())
        .get(`/consent/history?patientId=any&clinicId=${otherClinic.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('Deny by Default Verification', () => {
    it('should block access if an endpoint exists but has no role decorator', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('Subscription Billing Access', () => {
    it('should allow ADMIN to access subscription billing status', async () => {
      const adminToken = await getAuthToken(Role.ADMIN);
      await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should block DOCTOR from subscription billing status', async () => {
      const doctorToken = await getAuthToken(Role.DOCTOR);
      await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('Tenant Guard + AllowNoClinic', () => {
    it('should allow authenticated no-clinic user to access AllowNoClinic auth route', async () => {
      const token = await getAuthToken(Role.DOCTOR, null);

      await request(app.getHttpServer())
        .get('/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should block authenticated no-clinic user from clinic-scoped endpoint', async () => {
      const token = await getAuthToken(Role.ADMIN, null);

      await request(app.getHttpServer())
        .get('/subscription/billing')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Exact Contract Enforcement', () => {
    it('should reject unknown fields on billing checkout payload', async () => {
      const adminToken = await getAuthToken(Role.ADMIN);
      await request(app.getHttpServer())
        .post('/subscription/billing/checkout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tier: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
          extraField: 'not-allowed',
        })
        .expect(400);
    });
  });
});
