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
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import {
  CLINIC_OPERATIONS_TOKEN,
  type IClinicOperations,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

describe('Plan change entitlement refresh (e2e)', () => {
  let app: INestApplication | undefined;
  let httpServer: ReturnType<INestApplication['getHttpServer']> | undefined;
  let prisma: PrismaService | undefined;
  let clinicOps: IClinicOperations;
  let clinicAuthCache: ClinicAuthCacheService;
  let adminToken: string;
  let clinicId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
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

    clinicOps = nestApp.get<IClinicOperations>(CLINIC_OPERATIONS_TOKEN, {
      strict: false,
    });
    clinicAuthCache = nestApp.get<ClinicAuthCacheService>(
      ClinicAuthCacheService,
      { strict: false },
    );
  });

  beforeEach(async () => {
    if (!prisma || !httpServer) throw new Error('E2E app not initialized');
    await resetDatabase();

    const clinic = await factories.clinic({ tier: 'STARTER' });
    clinicId = clinic.id;

    const { user: admin, plainPassword } = await factories.user({
      clinicId,
      role: 'ADMIN',
    });

    const adminLogin = await request(httpServer)
      .post('/auth/login')
      .send({ email: admin.email, password: plainPassword })
      .expect(201);
    adminToken = adminLogin.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  const getPrescriptionTemplates = () => {
    if (!httpServer) throw new Error('E2E app not initialized');
    return request(httpServer)
      .get('/prescription-templates')
      .set('Authorization', `Bearer ${adminToken}`);
  };

  it('denies an ESSENTIAL feature to a STARTER clinic, then grants it after the plan change in the same session', async () => {
    if (!prisma) throw new Error('E2E app not initialized');

    // Primes the in-memory entitlement cache with the STARTER snapshot.
    await getPrescriptionTemplates().expect(403);

    await clinicOps.updateTierAndFeatures(clinicId, 'ESSENTIAL', 'ACTIVE', {});

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    expect(clinic?.tier).toBe('ESSENTIAL');

    // Same token, no re-login: only targeted cache invalidation makes the
    // upgraded tier visible to the guard (cached snapshot TTL is 5 minutes).
    await getPrescriptionTemplates().expect(200);
  });

  it('revokes the feature again on downgrade without a new session', async () => {
    await clinicOps.updateTierAndFeatures(clinicId, 'ESSENTIAL', 'ACTIVE', {});
    await getPrescriptionTemplates().expect(200);

    await clinicOps.updateTierAndFeatures(clinicId, 'STARTER', 'ACTIVE', {});
    await getPrescriptionTemplates().expect(403);
  });

  it('refreshes the cached entitlement for direct cache consumers after a plan change', async () => {
    if (!prisma) throw new Error('E2E app not initialized');

    // Prime the in-memory snapshot exactly as a prior request would leave it.
    const before = await clinicAuthCache.getClinicAuth(clinicId);
    expect(before.tier).toBe('STARTER');

    await clinicOps.updateTierAndFeatures(clinicId, 'ESSENTIAL', 'ACTIVE', {});

    // HTTP routes cannot observe staleness: the global SubscriptionStatusGuard
    // re-reads with bypassCache before TierGuard runs, refreshing the entry.
    // Non-HTTP consumers (background jobs, websocket guards) rely on the
    // targeted invalidation performed by the plan-change write path.
    const after = await clinicAuthCache.getClinicAuth(clinicId);
    expect(after.tier).toBe('ESSENTIAL');

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    expect(clinic?.tier).toBe('ESSENTIAL');
  });
});
