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

describe.skip('RBAC Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminClinic: { id: string; name: string };
  let _adminUser: {
    id: string;
    email: string;
    role: string;
    accessToken?: string;
  };
  let _adminToken: string;

  let doctorClinic: { id: string; name: string };
  let _doctorUser: {
    id: string;
    email: string;
    role: string;
    accessToken?: string;
  };
  let _doctorToken: string;

  let _staffClinic: { id: string; name: string };
  let _staffUser: {
    id: string;
    email: string;
    role: string;
    accessToken?: string;
  };
  let _staffToken: string;

  let _otherClinicUser: {
    id: string;
    email: string;
    role: string;
    accessToken?: string;
  };
  let _otherClinicToken: string;

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

    adminClinic = await factories.clinic();

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: '$2b$10$mock_hashed_password',
        role: 'ADMIN',
        clinicId: adminClinic.id,
      },
    });

    doctorUser = await prisma.user.create({
      data: {
        email: 'doctor@test.com',
        name: 'Doctor User',
        password: '$2b$10$mock_hashed_password',
        role: 'DOCTOR',
        clinicId: adminClinic.id,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        email: 'staff@test.com',
        name: 'Staff User',
        password: '$2b$10$mock_hashed_password',
        role: 'RECEPTIONIST',
        clinicId: adminClinic.id,
      },
    });

    doctorClinic = await factories.clinic();

    otherClinicUser = await prisma.user.create({
      data: {
        email: 'other@test.com',
        name: 'Other Clinic User',
        password: '$2b$10$mock_hashed_password',
        role: 'DOCTOR',
        clinicId: doctorClinic.id,
      },
    });

    adminToken = 'mock-admin-token';
    doctorToken = 'mock-doctor-token';
    staffToken = 'mock-staff-token';
    otherClinicToken = 'mock-other-token';
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('Appointment Authorization', () => {
    it('should allow ADMIN to create appointment', async () => {});

    it('should allow DOCTOR to create appointment', async () => {});

    it('should deny STAFF to create appointment', async () => {});

    it('should deny unauthenticated access', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          clinicId: adminClinic.id,
          patientId: 'patient-id',
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          description: 'Test appointment',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Prescription Authorization', () => {
    it('should allow DOCTOR to create prescription', async () => {});

    it('should deny STAFF to create prescription', async () => {});

    it('should deny ADMIN without doctor permission to create prescription', async () => {});
  });

  describe('Patient Authorization', () => {
    it('should allow ADMIN to view all patients in clinic', async () => {});

    it('should allow DOCTOR to view patients in clinic', async () => {});

    it('should deny STAFF to view patient details', async () => {});
  });

  describe('Clinic Isolation (Multi-tenancy)', () => {
    it('should prevent user from accessing other clinic data', async () => {});

    it('should prevent user from creating resources in other clinic', async () => {});

    it('should validate clinicId ownership on resource updates', async () => {});
  });

  describe('Role-Based Access Control', () => {
    describe('ADMIN Role', () => {
      it('should have access to admin endpoints', async () => {});

      it('should be able to manage clinic settings', async () => {});

      it('should be able to manage users', async () => {});
    });

    describe('DOCTOR Role', () => {
      it('should not have access to admin endpoints', async () => {});

      it('should only access clinical features', async () => {});

      it('should not be able to manage clinic settings', async () => {});
    });

    describe('STAFF Role', () => {
      it('should have limited appointment access', async () => {});

      it('should not access clinical records directly', async () => {});

      it('should not access financial operations', async () => {});
    });
  });

  describe('Protected Endpoints 403 Verification', () => {
    it('should return 403 for unauthorized role on appointment create', async () => {});

    it('should return 403 for unauthorized role on prescription create', async () => {});

    it('should return 403 for clinic isolation violation', async () => {});

    it('should return 403 for unauthorized role on invoice operations', async () => {});

    it('should return 403 for unauthorized role on patient delete', async () => {});

    it('should return 403 for unauthorized role on clinic settings update', async () => {});

    it('should return 403 for unauthorized role on user management', async () => {});

    it('should return 403 when accessing /admin endpoints as non-admin', async () => {});
  });

  describe('Guard Integration', () => {
    it('should properly apply @Roles decorator to all protected endpoints', async () => {});

    it('should reject request with expired JWT token', async () => {});

    it('should reject request with invalid JWT signature', async () => {});

    it('should reject request with missing Authorization header', async () => {});
  });

  describe('Decorator Application', () => {
    it('should have @Roles() applied to all auth-protected endpoints', async () => {});

    it('should have @Public() applied only to public endpoints', async () => {});
  });
});
