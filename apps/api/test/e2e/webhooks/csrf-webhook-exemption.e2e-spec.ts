import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import cookieParser from 'cookie-parser';
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
import { WhatsappMockToken } from '@/domains/whatsapp/application/services/whatsapp-mock.token';
import { mockWhatsappService } from '../../whatsapp.provider';
import { getCsrfHeaders } from '../../csrf-helpers';

/**
 * P5.12 — CSRF exemption regression for webhook ingress.
 *
 * Provider callbacks (Razorpay/ZeptoMail/WhatsApp) are server-to-server POSTs
 * with no browser session, authenticated by their own HMAC signature + replay
 * dedupe. The global CsrfInterceptor must NOT apply the double-submit check
 * to `/webhooks/*` POSTs: if it did, every legit callback would 403 before
 * signature verification ever ran.
 *
 * The regression contract asserted here:
 *   1. A webhook POST carrying a CSRF cookie but no signature reaches the
 *      signature check and fails with the *signature* error (400 missing /
 *      401 tampered) — never the CSRF 403.
 *   2. A correctly signed webhook POST passes through with a CSRF cookie
 *      present (the exemption ignores the cookie entirely).
 *   3. Negative control: a non-webhook mutation (/auth/logout) with a session
 *      cookie but no CSRF header still 403s — the exemption is scoped to the
 *      `/webhooks/*` prefix only and nothing else was weakened.
 */
describe('CSRF exemption for webhook ingress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const webhookSecret = 'e2e-razorpay-webhook-secret';

  const mockPaymentGateway = {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  const mockRazorpayConfig = {
    getRazorpayWebhookSecret: () => webhookSecret,
    getRazorpayKeyId: () => '',
    getRazorpayKeySecret: () => '',
  };

  const sign = (rawBody: Buffer): string =>
    createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

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
      .overrideProvider(WhatsappMockToken)
      .useValue(mockWhatsappService)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
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

  it('does not CSRF-block a webhook POST with a cookie but no signature (400, not 403)', async () => {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    const payload = { event: 'invoice.paid', payload: {} };

    const response = await request(app.getHttpServer())
      .post('/webhooks/subscriptions/razorpay')
      .set('Content-Type', 'application/json')
      .set('Cookie', [csrf.cookie])
      .send(JSON.stringify(payload));

    // The signature check runs (400 missing signature); the CSRF interceptor
    // exemption must have let the request through — a 403 here is the
    // regression this test exists to catch.
    expect(response.status).toBe(400);
    expect(response.status).not.toBe(403);
  });

  it('rejects a tampered-signature webhook POST with 401, not CSRF 403', async () => {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    const payload = { event: 'invoice.paid', payload: {} };
    const tampered = { event: 'payment.failed', payload: {} };

    const response = await request(app.getHttpServer())
      .post('/webhooks/subscriptions/razorpay')
      .set('Content-Type', 'application/json')
      .set('Cookie', [csrf.cookie])
      .set('x-razorpay-signature', sign(Buffer.from(JSON.stringify(tampered))))
      .send(JSON.stringify(payload));

    expect(response.status).toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('accepts a correctly signed webhook POST even with a CSRF cookie present (200)', async () => {
    const csrf = await getCsrfHeaders(app.getHttpServer());
    const payload = { event: 'invoice.paid', payload: {} };

    const response = await request(app.getHttpServer())
      .post('/webhooks/subscriptions/razorpay')
      .set('Content-Type', 'application/json')
      .set('Cookie', [csrf.cookie])
      .set('x-razorpay-signature', sign(Buffer.from(JSON.stringify(payload))))
      .send(JSON.stringify(payload));

    expect(response.status).toBe(200);

    const dedupeCount = await prisma.webhookReplayDedupe.count();
    expect(dedupeCount).toBeGreaterThan(0);
  });

  it('still CSRF-blocks a non-webhook mutation with a session cookie and no header (403)', async () => {
    // Negative control: the exemption must be scoped to /webhooks/* only.
    // /auth/logout with a session cookie is a strict double-submit path —
    // with no X-XSRF-TOKEN header it must 403 (INVALID_CSRF_TOKEN), proving
    // the webhook exemption did not weaken anything else.
    const csrf = await getCsrfHeaders(app.getHttpServer());

    // Single Cookie header with '; ' separators — supertest joins array values
    // with ', ', which cookie-parser would not split into two cookies.
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${csrf.cookie}; refresh_token=stale-session-token`)
      .send({});

    expect(response.status).toBe(403);
  });
});
