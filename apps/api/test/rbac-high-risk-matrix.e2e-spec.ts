import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
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
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from './whatsapp.provider';

/**
 * Table-driven checks for high-risk routes: TierGuard + RolesGuard must match
 * APP_ACCESS_MATRIX expectations. See docs/compliance/ACCESS_AUDIT.md traceability appendix.
 */
describe('RBAC high-risk matrix (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    setPrismaInstance(getPrismaInstance());
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('TierGuard: Starter clinic cannot reach Essential+ APIs', () => {
    let token: string;

    beforeEach(async () => {
      await resetDatabase();
      const clinic = await factories.clinic({ tier: 'CAPTURE' });
      const { user, plainPassword } = await factories.user({
        clinicId: clinic.id,
        role: Role.DOCTOR,
      });
      await factories.doctorClinic(user.id, clinic.id);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: plainPassword });

      token = loginResponse.body.access_token;
    });

    it.each([
      ['/whatsapp/stats'],
      ['/clinical/medical-coding/icd/search?q=test'],
    ])('returns 403 on Starter for %s', async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('RolesGuard: NURSE cannot reach medical coding API', () => {
    let token: string;

    beforeEach(async () => {
      await resetDatabase();
      const clinic = await factories.clinic({ tier: 'ESSENTIAL' });
      const { user, plainPassword } = await factories.user({
        clinicId: clinic.id,
        role: Role.NURSE,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: plainPassword });

      token = loginResponse.body.access_token;
    });

    it('returns 403 for GET /clinical/medical-coding/icd/search', async () => {
      const res = await request(app.getHttpServer())
        .get('/clinical/medical-coding/icd/search?q=test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('TierGuard: Front Desk plan mode blocks clinical APIs on high tier', () => {
    let token: string;

    beforeEach(async () => {
      await resetDatabase();
      const clinic = await factories.clinic({
        tier: 'PROFESSIONAL',
        planMode: 'FRONT_DESK',
      });
      const { user, plainPassword } = await factories.user({
        clinicId: clinic.id,
        role: Role.RECEPTIONIST,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: plainPassword });

      token = loginResponse.body.access_token;
    });

    it('returns 403 for GET /inventory/stats', async () => {
      await request(app.getHttpServer())
        .get('/inventory/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('RolesGuard: non-billing roles cannot read subscription billing', () => {
    it.each([[Role.DOCTOR], [Role.NURSE]])(
      'returns 403 for GET /subscription/billing (%s)',
      async (role: Role) => {
        await resetDatabase();
        const clinic = await factories.clinic({ tier: 'ESSENTIAL' });
        const { user, plainPassword } = await factories.user({
          clinicId: clinic.id,
          role,
        });
        if (role === Role.DOCTOR) {
          await factories.doctorClinic(user.id, clinic.id);
        }

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: plainPassword });

        const token = loginResponse.body.access_token;

        await request(app.getHttpServer())
          .get('/subscription/billing')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      },
    );
  });
});
