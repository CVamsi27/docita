// E2E: C5 — AuditLogAbacPolicy on the audit routes (GET /audit-logs + GET
// /audit/recent). Differential-equivalence: tenant-scoped admin read (the
// controller forces filter.clinicId to the requester's clinic — cross-clinic
// targeting via query params stays 200 with own rows only, no existence
// disclosure), the audit-reader role matrix, and the INTERNAL bypass. The
// roles gates are unchanged (RolesGuard runs before PolicyGuard), so DOCTOR on
// /audit-logs and INTERNAL on /audit/recent still 403.
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
import { signE2eAccessToken } from '../../e2e-auth-token';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

describe('Audit log ABAC policy (e2e, C5)', () => {
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
      .overrideProvider(WhatsappMockToken)
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
    if (app) await app.close();
    await closeDatabase();
  });

  const signStaff = async (clinicId: string, role: Role) => {
    const { user } = await factories.user({ clinicId, role });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  // AUDIT_LOGS is an ESSENTIAL-tier feature; STARTER clinics are gated out.
  const makeClinic = () => factories.clinic({ tier: ClinicTier.ESSENTIAL });

  const seedLog = async (clinicId: string, userId: string) =>
    prisma.auditLog.create({
      data: {
        clinicId,
        userId,
        action: 'PATIENT_PHI_READ',
        entityType: 'Patient',
        entityId: 'pat-1',
        status: 'SUCCESS',
      },
    });

  it('ADMIN reads own-clinic audit logs (200, own rows only)', async () => {
    const clinicA = await makeClinic();
    const { user, token } = await signStaff(clinicA.id, Role.ADMIN);
    await seedLog(clinicA.id, user.id);

    const res = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rows = res.body as Array<{ clinicId: string }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.clinicId === clinicA.id)).toBe(true);
  });

  it('ADMIN targeting another clinic via query is 403 (TenantGuard CLINIC_SCOPE_MISMATCH — no disclosure)', async () => {
    const clinicA = await makeClinic();
    const clinicB = await makeClinic();
    const { user: adminA, token: tokenA } = await signStaff(
      clinicA.id,
      Role.ADMIN,
    );
    await seedLog(clinicA.id, adminA.id);
    await seedLog(clinicB.id, adminA.id);

    // TenantGuard (runs before RolesGuard/PolicyGuard) rejects any clinicId
    // query param that is not the requester's own clinic — cross-tenant
    // targeting is impossible by construction; the policy's tenant discipline
    // + the controller's forced filter are the defense-in-depth layers.
    await request(app.getHttpServer())
      .get(`/audit-logs?clinicId=${clinicB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
  });

  it('ADMIN reads the recent audit summary (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN);

    await request(app.getHttpServer())
      .get('/audit/recent')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('ADMIN_DOCTOR reads the recent audit summary (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN_DOCTOR);

    await request(app.getHttpServer())
      .get('/audit/recent')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DOCTOR reads the recent audit summary (200)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);

    await request(app.getHttpServer())
      .get('/audit/recent')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DOCTOR on /audit-logs is 403 (roles gate unchanged)', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);

    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('PATIENT on /audit-logs is 403', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.PATIENT);

    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('NURSE on /audit-logs is 403', async () => {
    const clinicA = await makeClinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);

    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('INTERNAL reads audit logs across clinics (200 — bypass)', async () => {
    const clinicA = await makeClinic();
    const clinicB = await makeClinic();
    const { user: userA } = await signStaff(clinicA.id, Role.ADMIN);
    await seedLog(clinicA.id, userA.id);
    await seedLog(clinicB.id, userA.id);

    const { user: internal } = await factories.user({
      role: Role.INTERNAL,
      clinicId: null,
    });
    const token = signE2eAccessToken(jwtService, {
      sub: internal.id,
      email: internal.email,
      role: internal.role,
      name: internal.name,
      clinicId: null,
    });

    const res = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rows = res.body as Array<{ clinicId: string }>;
    expect(rows.length).toBe(2);
    expect(new Set(rows.map((row) => row.clinicId))).toEqual(
      new Set([clinicA.id, clinicB.id]),
    );
  });

  it('INTERNAL on /audit/recent is 403 (roles gate unchanged)', async () => {
    const clinicA = await makeClinic();
    const { user: internal } = await factories.user({
      role: Role.INTERNAL,
      clinicId: null,
    });
    const token = signE2eAccessToken(jwtService, {
      sub: internal.id,
      email: internal.email,
      role: internal.role,
      name: internal.name,
      clinicId: null,
    });

    await request(app.getHttpServer())
      .get('/audit/recent')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('unauthenticated /audit-logs is 401', async () => {
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
  });
});
