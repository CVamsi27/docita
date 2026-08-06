import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { Clinic, Patient, PrismaClient, User } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

describe('AppointmentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let clinic: Clinic;
  let doctor: User;
  let patient: Patient;
  let jwtToken: string;

  beforeAll(async () => {
    prisma = setupTestDatabase();
    setPrismaInstance(prisma);

    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    clinic = await factories.clinic();

    const { user: docUser, plainPassword } = await factories.user({
      clinicId: clinic.id,
    });
    doctor = docUser;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: doctor.email, password: plainPassword })
      .expect(201);

    jwtToken = loginRes.body.access_token;

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
      startTime.setDate(startTime.getDate() + 1);
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
      expect(response.body.items[0]).toHaveProperty('patient');
    });

    it('should scope doctor query to the authenticated doctor', async () => {
      const { user: secondDoctor } = await factories.user({
        clinicId: clinic.id,
        role: 'DOCTOR',
      });

      const ownAppointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 1800000),
          endTime: new Date(Date.now() + 3600000),
        },
      );
      const otherDoctorAppointment = await factories.appointment(
        patient.id,
        secondDoctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 5400000),
          endTime: new Date(Date.now() + 7200000),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments?doctorId=${secondDoctor.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBeTruthy();
      const appointmentIds = (response.body.items as Array<{ id: string }>).map(
        ({ id }) => id,
      );
      expect(appointmentIds).toContain(ownAppointment.id);
      expect(appointmentIds).not.toContain(otherDoctorAppointment.id);
    });

    it('should block doctor from fetching another doctor appointment by id', async () => {
      const { user: secondDoctor } = await factories.user({
        clinicId: clinic.id,
        role: 'DOCTOR',
      });
      const appointmentForSecondDoctor = await factories.appointment(
        patient.id,
        secondDoctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 3600000),
          endTime: new Date(Date.now() + 5400000),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments/${appointmentForSecondDoctor.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      // C2 (ADR-0013): the deny now fires at the ABAC guard stage
      // (PolicyGuard → AppointmentAbacPolicy) with the generic message;
      // the 403 wire contract is unchanged.
      expect(response.body.message).toContain('Access denied.');
    });
  });

  describe('/appointments/:id/start-consultation (POST)', () => {
    it('should start consultation for the assigned doctor and update queue token', async () => {
      const appointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 7200000),
          endTime: new Date(Date.now() + 9000000),
        },
      );

      await prisma.queueToken.create({
        data: {
          clinicId: clinic.id,
          appointmentId: appointment.id,
          patientId: patient.id,
          doctorId: doctor.id,
          tokenNumber: 1,
          tokenType: 'scheduled',
          status: 'WAITING',
          scheduledTime: appointment.startTime,
          estimatedDuration: 15,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(201);

      expect(response.body).toEqual({
        appointmentId: appointment.id,
        status: 'in-progress',
      });

      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(updatedAppointment?.status).toBe('IN_PROGRESS');

      const updatedQueueToken = await prisma.queueToken.findUnique({
        where: { appointmentId: appointment.id },
      });
      expect(updatedQueueToken?.status).toBe('IN_PROGRESS');
      expect(updatedQueueToken?.consultationStart).toBeTruthy();
    });

    it('should reject another clinician starting someone else’s consultation', async () => {
      const { user: secondDoctor } = await factories.user({
        clinicId: clinic.id,
        role: 'DOCTOR',
      });

      const appointment = await factories.appointment(
        patient.id,
        secondDoctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 10800000),
          endTime: new Date(Date.now() + 12600000),
        },
      );

      const response = await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      expect(response.body.message).toContain(
        'Only the assigned doctor can start this consultation',
      );
    });

    it('should reject non-clinical roles from starting consultations', async () => {
      const { user: receptionist, plainPassword } = await factories.user({
        clinicId: clinic.id,
        role: 'RECEPTIONIST',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: receptionist.email, password: plainPassword })
        .expect(201);

      const appointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 14400000),
          endTime: new Date(Date.now() + 16200000),
        },
      );

      await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${loginRes.body.access_token}`)
        .expect(403);
    });
  });

  describe('/appointments/:id/diagnoses (POST)', () => {
    it('is idempotent when the same diagnoses are synced twice', async () => {
      const icd = await prisma.icdCode.create({
        data: {
          code: 'A01.0',
          description: 'Typhoid fever',
          category: 'Infectious',
        },
      });

      const appointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 18000000),
          endTime: new Date(Date.now() + 19800000),
        },
      );

      const payload = {
        diagnoses: [{ icdCodeId: icd.id, notes: 'primary', isPrimary: true }],
      };

      const first = await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/diagnoses`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload)
        .expect(201);

      expect(first.body.success).toBe(true);
      expect(first.body.skipped).toBe(false);
      expect(first.body.count).toBe(1);
      const hashAfterFirst: string = first.body.contentHash;
      expect(hashAfterFirst).toBeTruthy();

      const second = await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/diagnoses`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(payload)
        .expect(201);

      expect(second.body.skipped).toBe(true);
      expect(second.body.contentHash).toBe(hashAfterFirst);
      expect(second.body.count).toBe(1);
    });

    it('rejects a stale contentHash from the client', async () => {
      const icd = await prisma.icdCode.create({
        data: {
          code: 'B99',
          description: 'Unspecified viral disease',
          category: 'Infectious',
        },
      });

      const appointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 21600000),
          endTime: new Date(Date.now() + 23400000),
        },
      );

      await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/diagnoses`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          diagnoses: [{ icdCodeId: icd.id, notes: 'updated', isPrimary: true }],
          contentHash: 'deadbeef',
        })
        .expect(400);
    });
  });
});
