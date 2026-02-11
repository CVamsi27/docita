import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from './setup';
import { factories, setPrismaInstance } from './factories';
import { RazorpaySubscriptionGateway } from '../src/gateways/razorpay-subscription.gateway';
import { mockRazorpayGateway } from './razorpay.provider';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';
import { mockWhatsappService } from './whatsapp.provider';

describe('Prescriptions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clinicId: string;
  let patientId: string;
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

    const clinic = await factories.clinic({ tier: 'PRO' });
    clinicId = clinic.id;

    const { user, plainPassword } = await factories.user({
      clinicId,
      role: 'DOCTOR',
    });
    doctorId = user.id;

    await factories.doctorClinic(user.id, clinicId);

    const patient = await factories.patient(clinicId);
    patientId = patient.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword });

    token = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('GET /prescriptions', () => {
    it('should list prescriptions for clinic', async () => {
      const response = await request(app.getHttpServer())
        .get('/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/prescriptions').expect(401);
    });
  });

  describe('POST /prescriptions', () => {
    it('should create prescription', async () => {
      const appointment = await factories.appointment(
        patientId,
        doctorId,
        clinicId,
      );
      const prescriptionData = {
        appointmentId: appointment.id,
        patientId,
        doctorId,
        medications: [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: 'twice daily',
            duration: '5 days',
          },
        ],
        instructions: 'After meals',
      };

      const response = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send(prescriptionData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId })
        .expect(400);
    });
  });

  describe('GET /prescriptions/:id', () => {
    it('should get prescription details', async () => {
      const appointment = await factories.appointment(
        patientId,
        doctorId,
        clinicId,
      );
      const createRes = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          appointmentId: appointment.id,
          patientId,
          doctorId,
          medications: [
            {
              name: 'Ibuprofen',
              dosage: '400mg',
              frequency: 'once daily',
              duration: '3 days',
            },
          ],
        });

      const prescriptionId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(prescriptionId);
    });

    it('should return 404 for non-existent prescription', async () => {
      await request(app.getHttpServer())
        .get('/prescriptions/non_existent_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
