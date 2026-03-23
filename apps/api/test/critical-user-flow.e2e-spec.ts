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

describe('Critical User Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let clinicId: string;
  let doctorId: string;
  let patientId: string;
  let _appointmentId: string;

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
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('Step 1: Authentication', () => {
    it('should register doctor and create clinic', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'doctor@clinic.com',
          password: 'SecurePass@123456',
          firstName: 'Dr.',
          lastName: 'Anderson',
          clinicName: 'Anderson Medical Clinic',
        })
        .expect(201);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user.email).toBe('doctor@clinic.com');
      expect(response.body.user.id).toBeDefined();

      authToken = response.body.access_token;
      doctorId = response.body.user.id;

      const clinics = await prisma.clinic.findMany({
        where: { createdBy: doctorId },
      });

      expect(clinics.length).toBeGreaterThan(0);
      clinicId = clinics[0].id;
    });

    it('should login with valid credentials', async () => {
      const { user } = await factories.user({
        email: 'existing@clinic.com',
        password: 'TestPass@123',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'existing@clinic.com',
          password: 'TestPass@123',
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@clinic.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('Step 2: Create Patient', () => {
    it('should create a new patient in the clinic', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'doctor2@clinic.com',
          password: 'SecurePass@123456',
          firstName: 'Dr.',
          lastName: 'Smith',
          clinicName: 'Smith Clinic',
        })
        .expect(201);

      authToken = authResponse.body.access_token;
      const clinic = await prisma.clinic.findFirst({
        where: { createdBy: authResponse.body.user.id },
      });
      clinicId = clinic.id;

      const response = await request(app.getHttpServer())
        .post(`/api/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '9876543410',
          dateOfBirth: '1985-05-15',
          gender: 'MALE',
          address: '123 Main St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          clinicId,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.firstName).toBe('John');
      expect(response.body.clinicId).toBe(clinicId);

      patientId = response.body.id;
    });

    it('should retrieve patient details', async () => {
      const { patient } = await factories.patient({ clinicId });
      patientId = patient.id;

      const response = await request(app.getHttpServer())
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(patientId);
      expect(response.body.firstName).toBeDefined();
    });
  });

  describe('Step 3: Book Appointment', () => {
    it('should create appointment for patient', async () => {
      const authResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'doctor3@clinic.com',
          password: 'SecurePass@123456',
          firstName: 'Dr.',
          lastName: 'Johnson',
          clinicName: 'Johnson Clinic',
        })
        .expect(201);

      authToken = authResponse.body.access_token;
      const doctorUser = authResponse.body.user;
      const clinic = await prisma.clinic.findFirst({
        where: { createdBy: doctorUser.id },
      });
      clinicId = clinic.id;

      const patientResponse = await request(app.getHttpServer())
        .post(`/api/patients`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '9876543411',
          dateOfBirth: '1990-01-20',
          gender: 'FEMALE',
          clinicId,
        })
        .expect(201);

      patientId = patientResponse.body.id;
      doctorId = doctorUser.id;

      const startTime = new Date();
      startTime.setHours(10, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      const response = await request(app.getHttpServer())
        .post(`/api/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          clinicId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          appointmentType: 'CONSULTATION',
          status: 'SCHEDULED',
          reason: 'Regular checkup',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
      expect(response.body.doctorId).toBe(doctorId);
      expect(response.body.status).toBe('SCHEDULED');

      appointmentId = response.body.id;
    });

    it('should prevent double-booking appointments', async () => {
      const { clinic } = await factories.clinic();
      const { user: doctor } = await factories.user();
      const { patient } = await factories.patient({ clinicId: clinic.id });

      const startTime = new Date();
      startTime.setHours(14, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      await request(app.getHttpServer())
        .post(`/api/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          clinicId: clinic.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          appointmentType: 'CONSULTATION',
          status: 'CONFIRMED',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          clinicId: clinic.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          appointmentType: 'CONSULTATION',
          status: 'SCHEDULED',
        })
        .expect(409);
    });
  });

  describe('Step 4: Consultation & Vital Signs', () => {
    it('should record vitals during consultation', async () => {
      const { clinic } = await factories.clinic();
      const { appointment } = await factories.appointment({
        clinicId: clinic.id,
      });

      const vitalResponse = await request(app.getHttpServer())
        .post(`/api/vital-signs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appointmentId: appointment.id,
          temperature: 98.6,
          bloodPressure: '120/80',
          heartRate: 72,
          respirationRate: 16,
          weight: 70,
          height: 175,
          bmi: 22.86,
        })
        .expect(201);

      expect(vitalResponse.body.temperature).toBe(98.6);
      expect(vitalResponse.body.bloodPressure).toBe('120/80');
    });
  });

  describe('Step 5: Create Prescription', () => {
    it('should create prescription for appointment', async () => {
      const { clinic } = await factories.clinic();
      const { appointment } = await factories.appointment({
        clinicId: clinic.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/api/prescriptions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appointmentId: appointment.id,
          medications: [
            {
              medicationId: 'med-001',
              dosage: 500,
              unit: 'mg',
              frequency: 'BD',
              duration: 10,
              instructions: 'Take with food',
            },
          ],
          notes: 'Take as prescribed',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.medications.length).toBeGreaterThan(0);
    });
  });

  describe('Step 6: Generate Invoice', () => {
    it('should create invoice for consultation', async () => {
      const { clinic } = await factories.clinic();
      const { appointment } = await factories.appointment({
        clinicId: clinic.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/api/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appointmentId: appointment.id,
          items: [
            {
              description: 'Consultation Fee',
              quantity: 1,
              unitPrice: 500,
              taxRate: 0.18,
            },
          ],
          taxRate: 0.18,
          paymentTermsDays: 7,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.amountDue).toBeGreaterThan(0);
      expect(response.body.status).toBe('DRAFT');
    });

    it('should process payment for invoice', async () => {
      const { clinic } = await factories.clinic();
      const { appointment } = await factories.appointment({
        clinicId: clinic.id,
      });

      const invoiceResponse = await request(app.getHttpServer())
        .post(`/api/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appointmentId: appointment.id,
          items: [
            {
              description: 'Consultation',
              quantity: 1,
              unitPrice: 1000,
              taxRate: 0.18,
            },
          ],
        })
        .expect(201);

      const invoiceId = invoiceResponse.body.id;

      const paymentResponse = await request(app.getHttpServer())
        .post(`/api/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: invoiceResponse.body.total,
          paymentMethod: 'CARD',
          transactionId: 'txn_001',
        })
        .expect(201);

      expect(paymentResponse.body.status).toBe('COMPLETED');
      expect(paymentResponse.body.amount).toBe(invoiceResponse.body.total);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow access to other clinic patient data', async () => {
      const { clinic: clinic1 } = await factories.clinic();
      const { clinic: clinic2 } = await factories.clinic();
      const { patient: patient1 } = await factories.patient({
        clinicId: clinic1.id,
      });
      const { patient: patient2 } = await factories.patient({
        clinicId: clinic2.id,
      });

      const { user: doctor1 } = await factories.user({ clinicId: clinic1.id });
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: doctor1.email,
          password: 'TestPass@123',
        })
        .expect(200);

      const token = loginResponse.body.access_token;

      await request(app.getHttpServer())
        .get(`/api/patients/${patient1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/patients/${patient2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('RBAC Enforcement', () => {
    it('staff should not be able to create appointments', async () => {
      const { user: staff } = await factories.user({ role: 'STAFF' });
      const { clinic } = await factories.clinic();
      const { patient } = await factories.patient({ clinicId: clinic.id });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: staff.email,
          password: 'TestPass@123',
        })
        .expect(200);

      const startTime = new Date();
      startTime.setHours(11, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      await request(app.getHttpServer())
        .post(`/api/appointments`)
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .send({
          patientId: patient.id,
          doctorId: staff.id,
          clinicId: clinic.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          appointmentType: 'CONSULTATION',
          status: 'SCHEDULED',
        })
        .expect(403);
    });

    it('patient should not be able to access admin endpoints', async () => {
      const { user: patient } = await factories.user({ role: 'PATIENT' });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: patient.email,
          password: 'TestPass@123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/super-admin/stats`)
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(403);
    });
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('docita-api');
    });

    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.ready).toBeDefined();
      expect(response.body.checks).toBeDefined();
    });
  });
});
