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
  let adminToken: string;
  let receptionistToken: string;
  let clinicId: string;
  let patientId: string;
  let doctorId: string;
  let doctorPassword: string;
  let loginDoctorToken: string;

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

    // The test exercises the FRONT_DESK *workspace profile* — the
    // clinic-wide guard that blocks clinical mutations regardless of
    // billing tier. We deliberately use a non-FRONT_DESK SKU (which
    // would also block doctor sign-in at the auth boundary, see the
    // dedicated SKU test below) so doctors can authenticate and we can
    // verify the workspace-profile guard still 403s their writes.
    const clinic = await factories.clinic({
      tier: 'PROFESSIONAL',
      settings: { workspaceProfile: 'FRONT_DESK' },
    });
    clinicId = clinic.id;

    const { user: doctor, plainPassword } = await factories.user({
      clinicId,
      role: 'DOCTOR',
    });
    doctorId = doctor.id;
    doctorPassword = plainPassword;

    await prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: 'VERIFIED',
        signatureUrl: 'https://example.com/signature.png',
        appLoginDisabled: true,
      },
    });

    await factories.doctorClinic(doctorId, clinicId);

    const { user: loginDoctor, plainPassword: loginDoctorPassword } =
      await factories.user({
        clinicId,
        role: 'DOCTOR',
      });
    await prisma.user.update({
      where: { id: loginDoctor.id },
      data: {
        verificationStatus: 'VERIFIED',
        signatureUrl: 'https://example.com/signature-2.png',
        appLoginDisabled: false,
      },
    });
    await factories.doctorClinic(loginDoctor.id, clinicId);

    const { user: admin, plainPassword: adminPassword } = await factories.user({
      clinicId,
      role: 'ADMIN',
    });

    const { user: receptionist, plainPassword: receptionistPassword } =
      await factories.user({
        clinicId,
        role: 'RECEPTIONIST',
      });

    const patient = await factories.patient(clinicId);
    patientId = patient.id;

    const adminLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: admin.email, password: adminPassword })
      .expect(201);
    adminToken = adminLogin.body.access_token;

    const doctorLoginOk = await request(httpServer)
      .post('/auth/login')
      .send({ email: loginDoctor.email, password: loginDoctorPassword })
      .expect(201);
    loginDoctorToken = doctorLoginOk.body.access_token;

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

  it('returns 403 for login when doctor profile has appLoginDisabled', async () => {
    if (!httpServer) throw new Error('E2E app not initialized');
    const doctor = await prisma!.user.findUniqueOrThrow({
      where: { id: doctorId },
    });
    await request(httpServer)
      .post('/auth/login')
      .send({ email: doctor.email, password: doctorPassword })
      .expect(403);
  });

  it('allows GET /prescriptions for read-only access', async () => {
    if (!httpServer) throw new Error('E2E app not initialized');
    await request(httpServer)
      .get('/prescriptions')
      .set('Authorization', `Bearer ${adminToken}`)
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
      .set('Authorization', `Bearer ${adminToken}`)
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

    expect(String(res.body?.message ?? '').toLowerCase()).toMatch(
      /workspace profile|feature|front desk|not available/i,
    );
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
      .set('Authorization', `Bearer ${loginDoctorToken}`)
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

  // SKU-level (clinic.tier) gate, independent of workspaceProfile.
  // The Front Desk plan is a reception-only SKU; clinical-role
  // sign-in is blocked at the auth boundary so a clinical user can
  // never even obtain a token, while admins and receptionists keep
  // working as expected.
  describe('FRONT_DESK SKU sign-in gate', () => {
    let frontDeskClinicId: string;
    let skuDoctorEmail: string;
    let skuDoctorPassword: string;
    let skuAdminDoctorEmail: string;
    let skuAdminDoctorPassword: string;
    let skuReceptionistEmail: string;
    let skuReceptionistPassword: string;
    let skuAdminEmail: string;
    let skuAdminPassword: string;

    beforeEach(async () => {
      if (!prisma) throw new Error('E2E prisma not initialized');
      const skuClinic = await factories.clinic({
        tier: 'FRONT_DESK',
        settings: { workspaceProfile: 'FRONT_DESK' },
      });
      frontDeskClinicId = skuClinic.id;

      const { user: skuDoctor, plainPassword: skuDoctorPlain } =
        await factories.user({
          clinicId: frontDeskClinicId,
          role: 'DOCTOR',
        });
      skuDoctorEmail = skuDoctor.email;
      skuDoctorPassword = skuDoctorPlain;

      const { user: skuAdminDoctor, plainPassword: skuAdminDoctorPlain } =
        await factories.user({
          clinicId: frontDeskClinicId,
          role: 'ADMIN_DOCTOR',
        });
      skuAdminDoctorEmail = skuAdminDoctor.email;
      skuAdminDoctorPassword = skuAdminDoctorPlain;

      const { user: skuRec, plainPassword: skuRecPlain } = await factories.user(
        {
          clinicId: frontDeskClinicId,
          role: 'RECEPTIONIST',
        },
      );
      skuReceptionistEmail = skuRec.email;
      skuReceptionistPassword = skuRecPlain;

      const { user: skuAdmin, plainPassword: skuAdminPlain } =
        await factories.user({
          clinicId: frontDeskClinicId,
          role: 'ADMIN',
        });
      skuAdminEmail = skuAdmin.email;
      skuAdminPassword = skuAdminPlain;
    });

    it('blocks DOCTOR sign-in', async () => {
      if (!httpServer) throw new Error('E2E app not initialized');
      await request(httpServer)
        .post('/auth/login')
        .send({ email: skuDoctorEmail, password: skuDoctorPassword })
        .expect(403);
    });

    it('blocks ADMIN_DOCTOR sign-in', async () => {
      if (!httpServer) throw new Error('E2E app not initialized');
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: skuAdminDoctorEmail,
          password: skuAdminDoctorPassword,
        })
        .expect(403);
    });

    it('allows RECEPTIONIST sign-in', async () => {
      if (!httpServer) throw new Error('E2E app not initialized');
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: skuReceptionistEmail,
          password: skuReceptionistPassword,
        })
        .expect(201);
    });

    it('allows ADMIN sign-in', async () => {
      if (!httpServer) throw new Error('E2E app not initialized');
      await request(httpServer)
        .post('/auth/login')
        .send({ email: skuAdminEmail, password: skuAdminPassword })
        .expect(201);
    });
  });
});
