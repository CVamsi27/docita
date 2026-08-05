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
import { PAYMENT_GATEWAY_TOKEN } from '@/domains/subscriptions/application/ports';
import { RazorpayConfigService } from '@/shared/modules/config/razorpay-config.service';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';

/**
 * P4.3 — payment webhook integrity and replay idempotency (Razorpay).
 *
 * Exercises the real `POST /webhooks/subscriptions/razorpay` ingress:
 * HMAC-SHA256 signature verification over the raw body, the DB-backed
 * `WebhookReplayDedupe` replay claim, and the handler dispatch path. The
 * payment gateway is mocked (its own signature re-check is a separate layer
 * already unit-covered); everything upstream of it is the real pipeline.
 */
describe('Razorpay subscription webhook (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const webhookSecret = 'e2e-razorpay-webhook-secret';

  const mockPaymentGateway = {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  // `.env.test` has no RAZORPAY_WEBHOOK_SECRET (and the repo .env is not a
  // test source of truth), so override the config service that feeds the real
  // `assertVerifiedRazorpayWebhook` pipeline instead of mutating process.env.
  const mockRazorpayConfig = {
    getRazorpayWebhookSecret: () => webhookSecret,
    getRazorpayKeyId: () => '',
    getRazorpayKeySecret: () => '',
  };

  const sign = (rawBody: Buffer): string =>
    createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  const sendWebhook = (
    payload: Record<string, unknown>,
    signature?: string,
  ) => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    let req = request(app.getHttpServer())
      .post('/webhooks/subscriptions/razorpay')
      .set('Content-Type', 'application/json')
      .send(rawBody.toString('utf-8'));
    if (signature !== undefined) {
      req = req.set('x-razorpay-signature', signature);
    }
    return req;
  };

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(PAYMENT_GATEWAY_TOKEN)
      .useValue(mockPaymentGateway)
      .overrideProvider(RazorpayConfigService)
      .useValue(mockRazorpayConfig)
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
    mockPaymentGateway.verifyWebhookSignature.mockClear();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await closeDatabase();
  });

  it('accepts a correctly signed webhook and records a replay-claim row', async () => {
    const payload = { event: 'invoice.paid', payload: {} };

    await sendWebhook(
      payload,
      sign(Buffer.from(JSON.stringify(payload))),
    ).expect(200);

    // The dedupe claim is the first line of webhook idempotency.
    const dedupeCount = await prisma.webhookReplayDedupe.count();
    expect(dedupeCount).toBeGreaterThan(0);
  });

  it('rejects a replayed webhook with 409 Conflict (idempotent processing)', async () => {
    const payload = { event: 'invoice.paid', payload: {} };
    const signature = sign(Buffer.from(JSON.stringify(payload)));

    await sendWebhook(payload, signature).expect(200);
    await sendWebhook(payload, signature).expect(409);
  });

  it('rejects a signature over a different body with 401', async () => {
    const payload = { event: 'invoice.paid', payload: {} };
    // Signature is computed over a different raw body than the one sent.
    const tampered = { event: 'payment.failed', payload: {} };

    await sendWebhook(
      payload,
      sign(Buffer.from(JSON.stringify(tampered))),
    ).expect(401);
  });

  it('rejects a missing signature header with 400', async () => {
    await sendWebhook({ event: 'invoice.paid', payload: {} }).expect(400);
  });

  it('dispatches a known event through the handler registry (payment.captured, no clinic note -> no-op)', async () => {
    // A `payment.captured` payload without a clinic_id note hits the real
    // PaymentCapturedWebhookHandler, which returns early (no clinic to
    // activate). 200 proves the handler dispatch path runs.
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_e2e',
            amount: 10000,
            currency: 'INR',
            status: 'captured',
            order_id: 'order_e2e',
            notes: {},
          },
        },
      },
    };

    await sendWebhook(
      payload,
      sign(Buffer.from(JSON.stringify(payload))),
    ).expect(200);
  });
});
