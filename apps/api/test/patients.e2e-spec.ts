import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { _ThrottlerGuard } from '@nestjs/throttler';
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
import { WhatsappService } from '@/modules/whatsapp/whatsapp.service';
import { mockWhatsappService } from './whatsapp.provider';

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
      .overrideProvider(RazorpaySubscriptionGateway)
      .useValue(mockRazorpayGateway)
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .overrideProvider(APP_INTERCEPTOR)
      .useValue({
        intercept: (
          _context: { switchToHttp: () => { getRequest: () => unknown } },
          next: { handle: () => unknown },
        ) => next.handle(),
      })
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
          phoneNumber: '9876543210',
          gender: 'FEMALE',
          dateOfBirth: '1990-05-15',
          email: 'jane@test.com',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.clinicId).toBe(clinicId);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '9876543210',
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

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(2);
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

      expect(response.body.id).toBe(patient.id);
      expect(response.body.firstName).toBe(patient.firstName);
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

      const response = await request(app.getHttpServer())
        .patch(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'UpdatedName',
          email: 'updated@test.com',
        })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedName');
      expect(response.body.email).toBe('updated@test.com');
      expect(response.body.id).toBe(patient.id);
    });
  });

  describe('DELETE /patients/:id', () => {
    it('should delete patient', async () => {
      const patient = await factories.patient(clinicId);

      await request(app.getHttpServer())
        .delete(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /patients/:id/appointments', () => {
    it('should get patient appointments', async () => {
      const patient = await factories.patient(clinicId);
      const appointment = await factories.appointment(
        patient.id,
        doctorId,
        clinicId,
      );

      const response = await request(app.getHttpServer())
        .get(`/patients/${patient.id}/appointments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((a) => a.id === appointment.id)).toBe(true);
    });
  });
});
