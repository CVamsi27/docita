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

describe('Front desk workspace (e2e)', () => {
  let app: INestApplication | undefined;
  let httpServer: ReturnType<INestApplication['getHttpServer']> | undefined;
  let prisma: PrismaService | undefined;
  let doctorToken: string;
  let receptionistToken: string;
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

    const nestApp = moduleFixture.createNestApplication();
    nestApp.useLogger(false);
    nestApp.useGlobalPipes(new ZodValidationPipe());
    await nestApp.init();
    app = nestApp;
    httpServer = nestApp.getHttpServer();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    if (!prisma || !httpServer) throw new Error('E2E app not initialized');
    await resetDatabase();

    const clinic = await factories.clinic({
      tier: 'PRO',
      settings: { workspaceProfile: 'FRONT_DESK' },
    });
    clinicId = clinic.id;

    const { user: doctor, plainPassword: doctorPassword } =
      await factories.user({
        clinicId,
        role: 'DOCTOR',
      });
    doctorId = doctor.id;

    await prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: 'VERIFIED',
        signatureUrl: 'https://example.com/signature.png',
      },
    });

    await factories.doctorClinic(doctorId, clinicId);

    const { user: receptionist, plainPassword: receptionistPassword } =
      await factories.user({
        clinicId,
        role: 'RECEPTIONIST',
      });

    const patient = await factories.patient(clinicId);
    patientId = patient.id;

    const doctorLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: doctor.email, password: doctorPassword })
      .expect(201);
    doctorToken = doctorLogin.body.access_token;

    const receptionistLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: receptionist.email, password: receptionistPassword })
      .expect(201);
    receptionistToken = receptionistLogin.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  it('allows GET /prescriptions for read-only access', async () => {
    if (!httpServer) throw new Error('E2E app not initialized');
    await request(httpServer)
      .get('/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);
  });

  it('returns 403 for POST /prescriptions when workspace is front desk', async () => {
    const appointment = await factories.appointment(
      patientId,
      doctorId,
      clinicId,
    );

    if (!httpServer) throw new Error('E2E app not initialized');
    const res = await request(httpServer)
      .post('/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
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
      })
      .expect(403);

    expect(res.body?.message).toContain('workspace profile');
  });

  it('returns 403 for POST start-consultation when workspace is front desk', async () => {
    const appointment = await factories.appointment(
      patientId,
      doctorId,
      clinicId,
      {
        startTime: new Date(Date.now() + 7200000),
        endTime: new Date(Date.now() + 9000000),
      },
    );

    if (!httpServer) throw new Error('E2E app not initialized');
    const res = await request(httpServer)
      .post(`/appointments/${appointment.id}/start-consultation`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403);

    expect(res.body?.message).toContain('Consultation start is not available');
  });

  it('allows receptionist GET /invoices for billing surfaces', async () => {
    if (!httpServer) throw new Error('E2E app not initialized');
    const res = await request(httpServer)
      .get('/invoices')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
