// E2E: C1 phase-2 — doctor assignment-pinning on GET /patients/:id plus the
// EmergencyAccess (Break-the-Glass) obligation path.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
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
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

describe('Patient ABAC assignment-pinning (e2e, C1 phase-2)', () => {
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

  it('assigned DOCTOR reads the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('unassigned DOCTOR is denied (403)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('ADMIN_DOCTOR bypasses pinning (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN_DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('NURSE bypasses pinning (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('unassigned DOCTOR with x-break-the-glass gains emergency access (200) and the grant is audited', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-break-the-glass', 'true')
      .set('x-btg-reason', 'e2e emergency test')
      .expect(200);

    // AuditService.createAuditLog maps { actionType -> action, resourceType ->
    // entityType, resourceId -> entityId }, so query the persisted columns.
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: 'EMERGENCY_ACCESS_GRANTED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeDefined();
    expect(auditRow?.entityId).toBe('BREAK_THE_GLASS');
  });

  it('unassigned DOCTOR without the BTG header is still denied after the emergency path exists (403)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('cross-clinic x-break-the-glass read still 404s at the tenant-scoped service layer and the attempt is audited', async () => {
    // BTG skips the policy stage + RLS, but NOT the service's tenant scope:
    // the controller passes the requester's own clinicId, so a clinic-A
    // doctor BTG-reading a clinic-B patient gets 404 (no existence
    // disclosure), and the interceptor still records the audited grant.
    const clinicA = await factories.clinic();
    const clinicB = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patientB = await factories.patient(clinicB.id);

    await request(app.getHttpServer())
      .get(`/patients/${patientB.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-break-the-glass', 'true')
      .set('x-btg-reason', 'e2e cross-clinic attempt')
      .expect(404);

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: 'EMERGENCY_ACCESS_GRANTED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeDefined();
    expect(auditRow?.entityId).toBe('BREAK_THE_GLASS');
  });
});
