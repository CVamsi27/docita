import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from './whatsapp.provider';
import {
  listPatientsResponseSchema,
  patientResponseSchema,
} from '@workspace/types';
import { expectMatchesSchema } from './contract-assertions';

async function getCsrfHeaders(server: string) {
  const response = await request(server).get('/health').expect(200);
  const cookies = response.get('Set-Cookie') ?? [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
  if (!csrfCookie) {
    throw new Error('CSRF cookie was not issued by /health');
  }
  const token = csrfCookie.split(';')[0]?.split('=')[1];
  if (!token) {
    throw new Error('CSRF cookie did not contain a token');
  }
  return {
    cookie: `XSRF-TOKEN=${token}`,
    token,
  };
}

describe('Patients (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clinicId: string;
  let doctorId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        get: () => Promise.resolve(null),
        set: () => Promise.resolve(null),
        del: () => Promise.resolve(null),
      })
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

  describe('POST /patients', () => {
    it('should create patient for clinic', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '9876543410',
          gender: 'FEMALE',
          dateOfBirth: '1990-05-15',
          email: 'jane@test.com',
          dpdpConsent: {
            accepted: true,
            noticeVersion: 'dpdp-notice-v1-2026-05-11',
            givenByName: 'Jane Doe',
          },
        })
        .expect(201);

      const body = expectMatchesSchema(patientResponseSchema, response.body);
      expect(body.id).toBeDefined();
      expect(body.firstName).toBe('Jane');
      expect(body.clinicId).toBe(clinicId);
    });

    it('should reject unauthenticated request', async () => {
      const csrf = await getCsrfHeaders(app.getHttpServer());

      await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', [csrf.cookie])
        .set('X-XSRF-TOKEN', csrf.token)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '9876543410',
          gender: 'FEMALE',
          dateOfBirth: '1990-05-15',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
        })
        .expect(400);
    });
  });

  describe('GET /patients', () => {
    it('should list patients for clinic', async () => {
      await factories.patient(clinicId);
      await factories.patient(clinicId);

      const response = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = expectMatchesSchema(
        listPatientsResponseSchema,
        response.body,
      );
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBe(2);
    });

    it('should search patients', async () => {
      const _patient = await factories.patient(clinicId, {
        firstName: 'SearchMe',
      });

      const response = await request(app.getHttpServer())
        .get('/patients?search=SearchMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0].firstName).toBe('SearchMe');
    });

    it('should not list patients from other clinics', async () => {
      const otherClinic = await factories.clinic();
      await factories.patient(otherClinic.id);

      const response = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items.length).toBe(0);
    });
  });

  describe('GET /patients/:id', () => {
    it('should get patient details', async () => {
      const patient = await factories.patient(clinicId);

      const response = await request(app.getHttpServer())
        .get(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = expectMatchesSchema(patientResponseSchema, response.body);
      expect(body.id).toBe(patient.id);
      expect(body.firstName).toBe(patient.firstName);
    });

    it('should return 404 for non-existent patient', async () => {
      await request(app.getHttpServer())
        .get('/patients/invalid_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /patients/:id', () => {
    it('should update patient', async () => {
      const patient = await factories.patient(clinicId);

      await request(app.getHttpServer())
        .patch(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'updated@test.com',
        })
        .expect(200);

      const updated = await request(app.getHttpServer())
        .get(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(updated.body.firstName).toBe(patient.firstName);
      expect(updated.body.email).toBe('updated@test.com');
      expect(updated.body.id).toBe(patient.id);
    });
  });
});
