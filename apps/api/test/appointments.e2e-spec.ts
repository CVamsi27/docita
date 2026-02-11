import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from './setup';
import { factories, setPrismaInstance } from './factories';

describe('AppointmentsController (e2e)', () => {
  let app: INestApplication;
  let prisma;
  let clinic;
  let doctor;
  let patient;
  let jwtToken;

  beforeAll(async () => {
    // 1. Initialize DB
    prisma = setupTestDatabase();
    setPrismaInstance(prisma);

    // 2. Clear DB
    await resetDatabase();

    // 3. Initialize App
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // 4. Seed Data
    // Create Clinic
    clinic = await factories.clinic();

    // Create Doctor & Link to Clinic
    const { user: docUser, plainPassword } = await factories.user({
      clinicId: clinic.id,
    });
    doctor = docUser;

    // Login to get Token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: doctor.email, password: plainPassword })
      .expect(201);

    jwtToken = loginRes.body.access_token;

    // Create Patient
    patient = await factories.patient(clinic.id);
  });

  afterAll(async () => {
    await resetDatabase();
    await closeDatabase();
    if (app) {
      await app.close();
    }
  });

  describe('/appointments (POST)', () => {
    it('should create a new appointment', async () => {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1); // Tomorrow
      startTime.setHours(10, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(10, 30, 0, 0);

      const payload = {
        clinicId: clinic.id,
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: 'consultation',
        status: 'scheduled',
        notes: 'E2E Test Appointment',
      };

      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.patientId).toBe(patient.id);
      expect(response.body.status).toBe('scheduled');
    });
  });

  describe('/appointments (GET)', () => {
    it('should list appointments for the clinic', async () => {
      // Create another appointment to ensure list works
      await factories.appointment(patient.id, doctor.id, clinic.id, {
        startTime: new Date(),
        endTime: new Date(new Date().getTime() + 1800000),
      });

      const response = await request(app.getHttpServer())
        .get(`/appointments?clinicId=${clinic.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      expect(response.body.items[0]).toHaveProperty('patient'); // Check relation included
    });
  });
});
