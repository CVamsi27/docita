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

describe.skip('RBAC 403 Forbidden Responses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let testClinic: { id: string; name: string };
  let testPatient: { id: string; firstName: string; lastName: string };
  let testAppointment: { id: string; patientId: string; doctorId: string };

  let adminUser: { id: string; email: string; token: string };
  let doctorUser: { id: string; email: string; token: string };
  let staffUser: { id: string; email: string; token: string };

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

    testClinic = await factories.clinic();

    adminUser = {
      id: 'admin-id',
      email: 'admin@test.com',
      token: 'admin-token-mock',
    };

    doctorUser = {
      id: 'doctor-id',
      email: 'doctor@test.com',
      token: 'doctor-token-mock',
    };

    staffUser = {
      id: 'staff-id',
      email: 'staff@test.com',
      token: 'staff-token-mock',
    };

    testPatient = await prisma.patient.create({
      data: {
        clinicId: testClinic.id,
        firstName: 'Test',
        lastName: 'Patient',
        email: 'patient@test.com',
        phone: '1234567890',
      },
    });

    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    testAppointment = await prisma.appointment.create({
      data: {
        clinicId: testClinic.id,
        patientId: testPatient.id,
        startTime,
        endTime,
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('Appointment Endpoints - 403 Responses', () => {
    it('should return 403 when STAFF tries to create appointment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/appointments`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          patientId: testPatient.id,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
          description: 'Test appointment',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 when STAFF tries to update appointment', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/clinics/${testClinic.id}/appointments/${testAppointment.id}`,
        )
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to delete appointment', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/api/v1/clinics/${testClinic.id}/appointments/${testAppointment.id}`,
        )
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when DOCTOR tries to delete appointment', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/api/v1/clinics/${testClinic.id}/appointments/${testAppointment.id}`,
        )
        .set('Authorization', `Bearer ${doctorUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Patient Endpoints - 403 Responses', () => {
    it('should return 403 when STAFF tries to delete patient', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/clinics/${testClinic.id}/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when DOCTOR tries to delete patient', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/clinics/${testClinic.id}/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${doctorUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to create patient', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/patients`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          firstName: 'New',
          lastName: 'Patient',
          email: 'new@test.com',
          phone: '9876543410',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Prescription Endpoints - 403 Responses', () => {
    it('should return 403 when STAFF tries to create prescription', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/prescriptions`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          patientId: testPatient.id,
          medications: [
            {
              name: 'Aspirin',
              dosage: '500mg',
              frequency: 'twice daily',
              duration: '7 days',
            },
          ],
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to update prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          clinicId: testClinic.id,
          patientId: testPatient.id,
          medications: [
            {
              name: 'Aspirin',
              dosage: '500mg',
              frequency: 'twice daily',
              duration: '7 days',
            },
          ],
        },
      });

      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/clinics/${testClinic.id}/prescriptions/${prescription.id}`,
        )
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          medications: [
            {
              name: 'Ibuprofen',
              dosage: '400mg',
              frequency: 'once daily',
              duration: '5 days',
            },
          ],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Invoice Endpoints - 403 Responses', () => {
    it('should return 403 when STAFF tries to create invoice', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/invoices`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          patientId: testPatient.id,
          items: [
            {
              description: 'Consultation',
              quantity: 1,
              price: 500,
            },
          ],
          total: 500,
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to mark invoice as paid', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          clinicId: testClinic.id,
          patientId: testPatient.id,
          items: [
            {
              description: 'Consultation',
              quantity: 1,
              price: 500,
            },
          ],
          total: 500,
          status: 'PENDING',
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/v1/clinics/${testClinic.id}/invoices/${invoice.id}/mark-paid`,
        )
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Clinic Settings - 403 Responses', () => {
    it('should return 403 when DOCTOR tries to update clinic settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clinics/${testClinic.id}`)
        .set('Authorization', `Bearer ${doctorUser.token}`)
        .send({
          name: 'Updated Clinic Name',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to update clinic settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/clinics/${testClinic.id}`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          name: 'Updated Clinic Name',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('User Management - 403 Responses', () => {
    it('should return 403 when DOCTOR tries to create user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/users`)
        .set('Authorization', `Bearer ${doctorUser.token}`)
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          role: 'RECEPTIONIST',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF tries to delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/clinics/${testClinic.id}/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Admin Endpoints - 403 Responses', () => {
    it('should return 403 when DOCTOR accesses admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${doctorUser.token}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when STAFF accesses admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Error Message Validation', () => {
    it('should return meaningful error message for 403 response', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/clinics/${testClinic.id}/patients`)
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          email: 'test@test.com',
          phone: '1234567890',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(
        /forbidden|not authorized|permission/i,
      );
    });
  });
});
