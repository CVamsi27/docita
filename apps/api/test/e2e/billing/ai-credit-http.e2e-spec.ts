import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { ZodValidationPipe } from 'nestjs-zod';
import { UsageType } from '@workspace/db';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/shared/modules/ai/ai.service';
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

// fs/promises named exports are non-configurable, so spying needs a module
// mock; the factory keeps every real implementation (unlink still deletes).
jest.mock('node:fs/promises', () => {
  const actual =
    jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');
  return { ...actual, unlink: jest.fn(actual.unlink) };
});

const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

/**
 * HTTP-level companion to `ai-credit-admission.e2e-spec.ts`.
 *
 * The AI credit guard sits behind the global auth/subscription/TierGuard
 * stack, so service-level tests cannot show that a exhausted allotment
 * actually surfaces as HTTP 402 to a clinician session, nor that the
 * admission claim is released when the AI call settles — only the
 * `POST /ai/ocr/extract` route has a generally-available feature gate
 * (OCR_ADVANCED; the AI_* features are in PLANNED_FEATURES and 403 for
 * everyone), so that is the route under test.
 */
describe('AI credit gating over HTTP (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let clinicId: string;
  let token: string;
  const extractMock = jest.fn();

  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .overrideProvider(AIService)
      .useValue({ extractFromMedicalDocument: extractMock })
      .compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.useLogger(false);
    nestApp.useGlobalPipes(new ZodValidationPipe());
    await nestApp.init();
    app = nestApp;

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    if (!prisma) throw new Error('E2E app not initialized');
    await resetDatabase();
    extractMock.mockReset();
    unlinkMock.mockClear();

    // ESSENTIAL: OCR_ADVANCED's minimum tier, and an enforced allotment (500).
    const clinic = await factories.clinic({ tier: 'ESSENTIAL' });
    clinicId = clinic.id;
    const { user, plainPassword } = await factories.user({ clinicId });
    const login = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: plainPassword });
    expect(login.status).toBe(201);
    token = login.body.access_token;
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  async function seedUsed(quantity: number): Promise<void> {
    if (!prisma) throw new Error('E2E app not initialized');
    await prisma.usageEvent.create({
      data: {
        clinicId,
        type: UsageType.AI_CREDITS,
        quantity,
        entityType: 'AIUsage',
        entityId: 'seed',
        eventKey: `http-seed:${clinicId}`,
        metadata: { feature: 'documentOcr' },
      },
    });
  }

  async function usedTotal(): Promise<number> {
    if (!prisma) throw new Error('E2E app not initialized');
    const result = await prisma.usageEvent.aggregate({
      where: { clinicId, type: UsageType.AI_CREDITS },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async function claimCount(): Promise<number> {
    if (!prisma) throw new Error('E2E app not initialized');
    return prisma.usageEvent.count({
      where: { clinicId, entityType: 'AiCreditAdmission' },
    });
  }

  function postExtract() {
    return request(app!.getHttpServer())
      .post('/ai/ocr/extract')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1X1, {
        filename: 'rx.png',
        contentType: 'image/png',
      });
  }

  it('surfaces the exhausted allotment as HTTP 402 without billing or claiming', async () => {
    await seedUsed(500); // ESSENTIAL allotment is 500.

    const res = await postExtract();

    expect(res.status).toBe(402);
    expect(JSON.stringify(res.body)).toContain(
      'AI credit allotment reached for this billing period',
    );
    expect(extractMock).not.toHaveBeenCalled();
    expect(await claimCount()).toBe(0);
    expect(await usedTotal()).toBe(500);
    // The uploaded document must not be left in temp on the 402 path.
    expect(unlinkMock).toHaveBeenCalled();
  });

  it('releases the admission claim when the AI call fails', async () => {
    extractMock.mockRejectedValue(new Error('llm unavailable'));

    const res = await postExtract();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(extractMock).toHaveBeenCalledTimes(1);
    expect(await claimCount()).toBe(0);
    expect(await usedTotal()).toBe(0);
  });

  it('records the usage and releases the claim on success', async () => {
    extractMock.mockResolvedValue({
      entity: 'medication',
      value: 'Paracetamol 500mg',
      confidence: 0.94,
    });

    const res = await postExtract();

    expect(res.status).toBe(201); // Nest default for POST.
    expect(res.body).toMatchObject({ value: 'Paracetamol 500mg' });
    expect(await claimCount()).toBe(0);

    // The success-path listener records documentOcr (3 credits) asynchronously.
    const deadline = Date.now() + 3000;
    let used = 0;
    while (Date.now() < deadline) {
      used = await usedTotal();
      if (used === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(used).toBe(3);
  });
});
