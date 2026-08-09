import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { WhatsappConfigService } from '@/shared/modules/config/whatsapp-config.service';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

/**
 * WhatsApp webhook ingress integrity (Meta) — P5.12 coverage gap.
 *
 * Exercises the real `POST /webhooks/whatsapp` end-to-end through the actual
 * express body parser: the raw body captured by Nest's `rawBody: true`
 * option, HMAC-SHA256 verification over that raw body using the configured
 * Meta app secret, and the DB-backed `WebhookReplayDedupe` replay claim.
 * Nothing in the signature path is mocked — only the downstream WhatsApp
 * facade (which the empty `entry` payload never reaches) is overridden, the
 * same isolation the Razorpay webhook e2e uses.
 */
describe('WhatsApp webhook ingress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const webhookSecret = 'e2e-meta-app-secret';

  const mockMetaConfig = {
    getMetaConfig: () => ({
      accessToken: '',
      phoneNumberId: '',
      businessAccountId: '',
      appSecret: webhookSecret,
      verifyToken: 'e2e-verify-token',
      productionMode: false,
    }),
    isPerClinicWhatsappSenderEnabled: () => false,
  };

  const sign = (rawBody: Buffer): string =>
    `sha256=${createHmac('sha256', webhookSecret).update(rawBody).digest('hex')}`;

  const sendWebhook = (payload: unknown, signature?: string) => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    let req = request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .send(rawBody.toString('utf-8'));
    if (signature !== undefined) {
      req = req.set('x-hub-signature-256', signature);
    }
    return req;
  };

  // Valid per whatsappWebhookPayloadSchema; empty entry makes the use-case a
  // no-op so the test isolates the signature/replay pipeline.
  const validPayload = { object: 'whatsapp_business_account', entry: [] };

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappConfigService)
      .useValue(mockMetaConfig)
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  it('accepts a correctly signed webhook and records a replay-claim row', async () => {
    const response = await sendWebhook(
      validPayload,
      sign(Buffer.from(JSON.stringify(validPayload))),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    // The dedupe claim is the first line of webhook idempotency.
    const dedupeCount = await prisma.webhookReplayDedupe.count();
    expect(dedupeCount).toBeGreaterThan(0);
  });

  it('rejects a replayed webhook with 409 Conflict (idempotent processing)', async () => {
    const signature = sign(Buffer.from(JSON.stringify(validPayload)));

    await sendWebhook(validPayload, signature).expect(200);
    await sendWebhook(validPayload, signature).expect(409);
  });

  it('rejects a signature computed over a different raw body with 401', async () => {
    // HMAC is over the exact bytes — a schema-valid but byte-different body
    // signed with the same secret must not authenticate.
    const otherPayload = { object: 'whatsapp_business_account_2', entry: [] };

    const response = await sendWebhook(
      validPayload,
      sign(Buffer.from(JSON.stringify(otherPayload))),
    );

    expect(response.status).toBe(401);
  });

  it('rejects a signature from a different app secret with 401', async () => {
    const wrongSignature = `sha256=${createHmac('sha256', 'wrong-secret')
      .update(Buffer.from(JSON.stringify(validPayload)))
      .digest('hex')}`;

    await sendWebhook(validPayload, wrongSignature).expect(401);
  });

  it('rejects a missing signature header with 401', async () => {
    await sendWebhook(validPayload).expect(401);
  });

  it('binds the signature to the exact raw body, not the signature string (byte-level)', async () => {
    // The same signature string sent over a different schema-valid body must
    // fail HMAC (401) — the replay dedupe must never see a mismatched body.
    const signature = sign(Buffer.from(JSON.stringify(validPayload)));
    const otherPayload = { object: 'whatsapp_business_account_3', entry: [] };

    await sendWebhook(validPayload, signature).expect(200);
    await sendWebhook(otherPayload, signature).expect(401);
  });
});
