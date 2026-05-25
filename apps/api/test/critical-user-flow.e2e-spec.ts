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
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from './whatsapp.provider';

describe('Critical User Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  const createAuthenticatedDoctor = async () => {
    const clinic = await factories.clinic({ tier: 'PRO' });
    const { user, plainPassword } = await factories.user({
      clinicId: clinic.id,
      role: 'DOCTOR',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: 'VERIFIED',
        signatureUrl: 'https://example.com/signature.png',
      },
    });

    await factories.doctorClinic(user.id, clinic.id);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword })
      .expect(201);

    return {
      clinic,
      doctor: user,
      token: loginResponse.body.access_token as string,
    };
  };

  describe('Happy Path', () => {
    it('should complete patient -> appointment -> prescription -> invoice flow', async () => {
      const { clinic, doctor, token } = await createAuthenticatedDoctor();

      const patientResponse = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '9876543410',
          gender: 'MALE',
          dateOfBirth: '1990-05-15',
          email: 'john@example.com',
          dpdpConsent: {
            accepted: true,
            noticeVersion: 'dpdp-notice-v1-2026-05-11',
            givenByName: 'John Doe',
          },
        })
        .expect(201);

      const patientId = patientResponse.body.id as string;
      expect(patientId).toBeDefined();
      expect(patientResponse.body.clinicId).toBe(clinic.id);

      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clinicId: clinic.id,
          patientId,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          type: 'consultation',
          status: 'scheduled',
          notes: 'Critical flow e2e appointment',
        })
        .expect(201);

      const appointmentId = appointmentResponse.body.id as string;
      expect(appointmentId).toBeDefined();

      const prescriptionResponse = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          appointmentId,
          patientId,
          doctorId: doctor.id,
          medications: [
            {
              name: 'Paracetamol',
              dosage: '500mg',
              frequency: 'twice daily',
              duration: '5 days',
            },
          ],
          instructions: 'After meals',
        })
        .expect(201);

      expect(prescriptionResponse.body.id).toBeDefined();
      expect(prescriptionResponse.body.patientId).toBe(patientId);

      const invoiceResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId,
          items: [{ description: 'Consultation', quantity: 1, price: 500 }],
          status: 'PENDING',
          total: 500,
        })
        .expect(201);

      expect(invoiceResponse.body.id).toBeDefined();
      expect(invoiceResponse.body.patientId).toBe(patientId);
    });
  });

  describe('RBAC and Guardrails', () => {
    it('should block receptionist from starting consultation (403)', async () => {
      const { clinic, doctor } = await createAuthenticatedDoctor();

      const { user: receptionist, plainPassword } = await factories.user({
        clinicId: clinic.id,
        role: 'RECEPTIONIST',
      });

      const receptionistLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: receptionist.email, password: plainPassword })
        .expect(201);

      const patient = await factories.patient(clinic.id);
      const appointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        },
      );

      await request(app.getHttpServer())
        .post(`/appointments/${appointment.id}/start-consultation`)
        .set('Authorization', `Bearer ${receptionistLogin.body.access_token}`)
        .expect(403);
    });

    it('should scope a doctor query to their own appointments', async () => {
      const { clinic, doctor, token } = await createAuthenticatedDoctor();

      const { user: anotherDoctor } = await factories.user({
        clinicId: clinic.id,
        role: 'DOCTOR',
      });

      const patient = await factories.patient(clinic.id);
      const ownAppointment = await factories.appointment(
        patient.id,
        doctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        },
      );
      const anotherDoctorAppointment = await factories.appointment(
        patient.id,
        anotherDoctor.id,
        clinic.id,
        {
          startTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments?doctorId=${anotherDoctor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      const appointmentIds = (response.body.items as Array<{ id: string }>).map(
        ({ id }) => id,
      );
      expect(appointmentIds).toContain(ownAppointment.id);
      expect(appointmentIds).not.toContain(anotherDoctorAppointment.id);
    });
  });
});
