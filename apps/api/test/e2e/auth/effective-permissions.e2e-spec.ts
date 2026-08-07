// E2E: C7 — GET /auth/effective-permissions. The snapshot mirrors the client
// matrix (differential spot-checks: ADMIN dashboard/comingSoon/tier-gated
// targets, FRONT_DESK mode clinical block, INTERNAL all-true bypass) and is
// NON-authoritative by contract (server remains the enforcement point).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ClinicTier, Role } from '@workspace/db';
import { APP_ACCESS_TARGETS } from '@workspace/types';
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

describe('Effective permissions snapshot (e2e, C7)', () => {
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

  const signStaff = async (
    clinicId: string,
    role: Role,
    overrides: { clinicId?: string | null } = {},
  ) => {
    const { user } = await factories.user({ clinicId, role });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId:
        overrides.clinicId !== undefined ? overrides.clinicId : user.clinicId,
    });
    return { user, token };
  };

  it('ADMIN at PROFESSIONAL/FULL: 200 with matrix-accurate snapshot', async () => {
    const clinic = await factories.clinic({ tier: ClinicTier.PROFESSIONAL });
    const { token } = await signStaff(clinic.id, Role.ADMIN);

    const res = await request(app.getHttpServer())
      .get('/auth/effective-permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as {
      role: string;
      tier: string;
      planMode: string;
      generatedAt: string;
      targets: Record<string, { read: boolean; write: boolean }>;
    };
    expect(body.role).toBe('ADMIN');
    expect(body.tier).toBe('PROFESSIONAL');
    expect(body.planMode).toBe('FULL');
    expect(body.generatedAt).toBeDefined();
    expect(body.targets[APP_ACCESS_TARGETS.PAGE_DASHBOARD].read).toBe(true);
    // comingSoon is always false.
    expect(body.targets[APP_ACCESS_TARGETS.PAGE_HOSPITAL].read).toBe(false);
    // HOSPITAL-tier-only target is false at PROFESSIONAL.
    expect(body.targets[APP_ACCESS_TARGETS.PAGE_DESK_FLOOR].read).toBe(false);
  });

  it('FRONT_DESK mode: clinical targets blocked, front-desk targets open', async () => {
    const clinic = await factories.clinic({
      tier: ClinicTier.ESSENTIAL,
      planMode: 'FRONT_DESK',
    });
    const { token } = await signStaff(clinic.id, Role.ADMIN);

    const res = await request(app.getHttpServer())
      .get('/auth/effective-permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const targets = (
      res.body as { targets: Record<string, { read: boolean; write: boolean }> }
    ).targets;
    expect(targets[APP_ACCESS_TARGETS.API_PRESCRIPTIONS].read).toBe(false);
    expect(targets[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT].read).toBe(
      true,
    );
    expect(targets[APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT].write).toBe(
      true,
    );
  });

  it('INTERNAL bypass: every target true', async () => {
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
      .get('/auth/effective-permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const targets = (
      res.body as { targets: Record<string, { read: boolean; write: boolean }> }
    ).targets;
    const keys = Object.keys(targets);
    expect(keys.length).toBeGreaterThan(40);
    for (const key of keys) {
      expect(targets[key].read).toBe(true);
      expect(targets[key].write).toBe(true);
    }
  });

  it('PATIENT is rejected (403 — staff/console roles only)', async () => {
    const clinic = await factories.clinic({ tier: ClinicTier.ESSENTIAL });
    const { token } = await signStaff(clinic.id, Role.PATIENT);

    await request(app.getHttpServer())
      .get('/auth/effective-permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('unauthenticated request is rejected (401)', async () => {
    await request(app.getHttpServer())
      .get('/auth/effective-permissions')
      .expect(401);
  });
});
