import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
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
import { signE2eAccessToken } from './e2e-auth-token';

describe('Front desk tier (e2e)', () => {
  let app: INestApplication | undefined;
  let jwtService: JwtService;
  let httpServer: ReturnType<INestApplication['getHttpServer']> | undefined;
  let prisma: PrismaService | undefined;
  let adminToken: string;
  let receptionistToken: string;
  let clinicId: string;
  let patientId: string;
  let doctorId: string;
  let doctorPassword: string;

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

    const nestApp = moduleFixture.createNestApplication();
    nestApp.useLogger(false);
    nestApp.useGlobalPipes(new ZodValidationPipe());
    await nestApp.init();
    app = nestApp;
    httpServer = nestApp.getHttpServer();
    jwtService = nestApp.get(JwtService);

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    if (!prisma || !httpServer) throw new Error('E2E app not initialized');
    await resetDatabase();

    // Clinical mutation guard keys off clinic.tier === FRONT_DESK.
    const clinic = await factories.clinic({
      tier: 'FRONT_DESK',
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

  it('returns 403 for POST /prescriptions on FRONT_DESK tier', async () => {
    const appointment = await factories.appointment(
      patientId,
      doctorId,
      clinicId,
    );

    await prisma!.user.update({
      where: { id: doctorId },
      data: { appLoginDisabled: false },
    });
    const doctor = await prisma!.user.findUniqueOrThrow({
      where: { id: doctorId },
    });
    const doctorToken = signE2eAccessToken(jwtService, {
      sub: doctor.id,
      email: doctor.email,
      role: Role.DOCTOR,
      name: doctor.name,
      clinicId,
    });

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

    expect(String(res.body?.message ?? '').toLowerCase()).toMatch(
      /front desk|not available|starter tier or higher/i,
    );
  });

  it('returns 403 for POST start-consultation on FRONT_DESK tier', async () => {
    const appointment = await factories.appointment(
      patientId,
      doctorId,
      clinicId,
      {
        startTime: new Date(Date.now() + 7200000),
        endTime: new Date(Date.now() + 9000000),
      },
    );

    // JWT auth still validates the user row; appLoginDisabled only blocks login.
    await prisma!.user.update({
      where: { id: doctorId },
      data: { appLoginDisabled: false },
    });

    const doctor = await prisma!.user.findUniqueOrThrow({
      where: { id: doctorId },
    });
    const doctorToken = signE2eAccessToken(jwtService, {
      sub: doctor.id,
      email: doctor.email,
      role: Role.DOCTOR,
      name: doctor.name,
      clinicId,
    });

    if (!httpServer) throw new Error('E2E app not initialized');
    const res = await request(httpServer)
      .post(`/appointments/${appointment.id}/start-consultation`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403);

    expect(String(res.body?.message ?? '').toLowerCase()).toMatch(
      /front desk|consultation start is not available/i,
    );
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

  // Auth-time gate: clinical-role sign-in is blocked on FRONT_DESK tier.
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
      // Auth-time gate keys off clinic.tier alone — workspaceProfile
      // is a separate concern enforced by route-level guards. Leaving
      // the profile unset here proves the SKU is sufficient.
      const skuClinic = await factories.clinic({ tier: 'FRONT_DESK' });
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
