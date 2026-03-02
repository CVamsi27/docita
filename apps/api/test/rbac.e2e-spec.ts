import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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
import { Role } from '@workspace/db';
import cookieParser from 'cookie-parser';

describe('RBAC Enforcement (e2e)', () => {
  let app: INestApplication;
  let clinicId: string;
  let csrfCookie: string;
  let csrfToken: string;

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
    app.useLogger(false);
    await app.init();

    setPrismaInstance(getPrismaInstance());
  });

  beforeEach(async () => {
    await resetDatabase();

    const clinic = await factories.clinic();
    clinicId = clinic.id;

    const getRes = await request(app.getHttpServer()).get('/');
    const cookies = getRes.get('Set-Cookie');
    const cookie = cookies!.find((c) => c.startsWith('XSRF-TOKEN='));
    csrfCookie = cookie!;
    csrfToken = cookie!.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  const getAuthToken = async (role: Role) => {
    const userObj = await factories.user({ clinicId, role });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Cookie', [csrfCookie])
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ email: userObj.user.email, password: userObj.plainPassword })
      .expect(201);
    return loginRes.body.access_token;
  };

  describe('Super Admin Endpoints', () => {
    it('should block non-SUPER_ADMIN (e.g., ADMIN) from super-admin endpoints', async () => {
      const adminToken = await getAuthToken(Role.ADMIN);
      await request(app.getHttpServer())
        .get('/super-admin/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should allow SUPER_ADMIN to access super-admin endpoints', async () => {
      const superAdminToken = await getAuthToken(Role.SUPER_ADMIN);
      await request(app.getHttpServer())
        .get('/super-admin/clinics')
        .set('Authorization', `Bearer ${superAdminToken}`)
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
});
