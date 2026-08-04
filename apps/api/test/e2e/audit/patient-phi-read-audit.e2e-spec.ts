import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ClinicTier, Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { signE2eAccessToken } from '../../e2e-auth-token';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

describe('Audit events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .overrideProvider(CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN)
      .useValue(mockPaymentLinkProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    clearMockPaymentLinkProvider(mockPaymentLinkProvider);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  const signToken = async (
    role: Role,
    clinicId: string | null,
    overrides: { patientId?: string } = {},
  ) => {
    const { user } = await factories.user({ clinicId, role });
    return {
      user,
      token: signE2eAccessToken(jwtService, {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        clinicId: user.clinicId,
        ...(overrides.patientId ? { patientId: overrides.patientId } : {}),
      }),
    };
  };

  const createDoctorWithAccess = async (clinicId: string) => {
    const { user, token } = await signToken(Role.DOCTOR, clinicId);
    await factories.doctorClinic(user.id, clinicId);
    return { user, token };
  };

  describe('PHI read auditing', () => {
    it('emits a VIEW_PROFILE AuditLog row when a doctor reads a patient profile', async () => {
      const clinic = await factories.clinic();
      const { user, token } = await createDoctorWithAccess(clinic.id);
      const patient = await factories.patient(clinic.id);

      await request(app.getHttpServer())
        .get(`/patients/${patient.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const auditRow = await prisma.auditLog.findFirst({
        where: {
          clinicId: clinic.id,
          userId: user.id,
          entityType: 'Patient',
          entityId: patient.id,
        },
      });

      expect(auditRow).not.toBeNull();
      expect(auditRow?.action).toBe('VIEW_PROFILE');
      expect(auditRow?.status).toBe('SUCCESS');
      expect(auditRow?.ipAddress).toBeDefined();
      expect(auditRow?.userAgent).toBeDefined();
    });

    it('does not emit an audit row for an unauthenticated profile read', async () => {
      const clinic = await factories.clinic();
      const patient = await factories.patient(clinic.id);

      const before = await prisma.auditLog.count();

      await request(app.getHttpServer())
        .get(`/patients/${patient.id}`)
        .expect(401);

      const after = await prisma.auditLog.count();
      expect(after).toBe(before);
    });

    it('does not emit an audit row when a doctor reads another clinic patient (404 by design)', async () => {
      const clinicA = await factories.clinic();
      const clinicB = await factories.clinic();
      const { token: tokenA } = await createDoctorWithAccess(clinicA.id);
      const patientB = await factories.patient(clinicB.id);

      // Cross-clinic reads return 404 (resource existence is not disclosed),
      // so no audit row may exist for clinic B.
      await request(app.getHttpServer())
        .get(`/patients/${patientB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);

      const auditRow = await prisma.auditLog.findFirst({
        where: {
          clinicId: clinicB.id,
          entityType: 'Patient',
          entityId: patientB.id,
        },
      });

      expect(auditRow).toBeNull();
    });
  });

  describe('Audit log query surface', () => {
    it('returns 401 for unauthenticated /audit-logs', async () => {
      await request(app.getHttpServer()).get('/audit-logs').expect(401);
    });

    it('returns 403 for a DOCTOR (not in the ADMIN/INTERNAL role set)', async () => {
      const clinic = await factories.clinic();
      const { token } = await createDoctorWithAccess(clinic.id);

      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns only the requesting clinic rows for an ADMIN', async () => {
      // AUDIT_LOGS is an ESSENTIAL-tier feature; STARTER clinics are gated out.
      const clinicA = await factories.clinic({ tier: ClinicTier.ESSENTIAL });
      const clinicB = await factories.clinic({ tier: ClinicTier.ESSENTIAL });
      const { user: adminA, token: tokenA } = await signToken(
        Role.ADMIN,
        clinicA.id,
      );
      const { token: tokenB } = await signToken(Role.ADMIN, clinicB.id);

      // Generate a PHI-read audit row in clinic A only.
      const { token: doctorA } = await createDoctorWithAccess(clinicA.id);
      const patientA = await factories.patient(clinicA.id);
      await request(app.getHttpServer())
        .get(`/patients/${patientA.id}`)
        .set('Authorization', `Bearer ${doctorA}`)
        .expect(200);

      const adminAResponse = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      const adminBResponse = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const adminARows = adminAResponse.body as Array<{ clinicId: string }>;
      const adminBRows = adminBResponse.body as Array<{ clinicId: string }>;

      expect(adminARows.length).toBeGreaterThan(0);
      expect(adminARows.every((row) => row.clinicId === clinicA.id)).toBe(true);

      const clinicALeak = adminBRows.some(
        (row) => row.clinicId === clinicA.id,
      );
      expect(clinicALeak).toBe(false);
    });
  });
});
