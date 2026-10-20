import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { RazorpayConfigService } from '@/shared/modules/config/razorpay-config.service';
import { RazorpayInvoiceWebhookService } from '@/domains/billing/application/services/razorpay-invoice-webhook.service';
import {
  PAYMENT_SESSION_REPOSITORY_TOKEN,
  type IPaymentSessionRepository,
} from '@/domains/billing/core/repositories/payment-session.repository';

/**
 * F01 — patient-to-clinic payment webhook replay, ownership and recovery.
 *
 * Exercises the real `POST /webhooks/payments/razorpay` ingress (HMAC raw-body
 * verification + replay dedupe) plus the handler-level identity guards:
 * duplicate delivery cannot double-credit, a wrong-context amount cannot mark
 * an invoice PAID, and a retried delivery that outlives the ingress replay
 * window is a no-op.
 *
 * Each case uses its own provider payment/order ids because the test reset
 * truncates business tables but not the append-only outbox.
 */
describe('Razorpay payment webhook recovery (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhookService: RazorpayInvoiceWebhookService;
  let sessionRepository: IPaymentSessionRepository;

  const webhookSecret = 'e2e-razorpay-payment-webhook-secret';

  // `.env.test` has no RAZORPAY_WEBHOOK_SECRET; override the config service
  // that feeds the real `assertVerifiedRazorpayWebhook` pipeline instead of
  // mutating process.env.
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
      .post('/webhooks/payments/razorpay')
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
      .overrideProvider(RazorpayConfigService)
      .useValue(mockRazorpayConfig)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
    webhookService = moduleFixture.get<RazorpayInvoiceWebhookService>(
      RazorpayInvoiceWebhookService,
    );
    sessionRepository = moduleFixture.get<IPaymentSessionRepository>(
      PAYMENT_SESSION_REPOSITORY_TOKEN,
    );
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

  const capturePayload = (
    paymentId: string,
    orderId: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          amount: 12500,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          ...overrides,
        },
      },
    },
  });

  async function seedSession(orderId: string): Promise<{
    clinicId: string;
    invoiceId: string;
    sessionId: string;
  }> {
    const clinic = await factories.clinic();
    const patient = await factories.patient(clinic.id);
    const invoice = await factories.invoice(patient.id, {
      clinicId: clinic.id,
      total: 125,
      subtotalCents: 12500,
      totalCents: 12500,
      currency: 'INR',
    });
    const session = await prisma.paymentSession.create({
      data: {
        clinicId: clinic.id,
        invoiceId: invoice.id,
        patientId: patient.id,
        provider: 'razorpay',
        providerSessionId: orderId,
        amount: 12500,
        currency: 'INR',
        status: PaymentSessionStatus.PENDING,
      },
    });
    return {
      clinicId: clinic.id,
      invoiceId: invoice.id,
      sessionId: session.id,
    };
  }

  const outboxCountFor = (providerPaymentId: string) =>
    prisma.outboxEvent.count({
      where: { idempotencyKey: `payment-captured:${providerPaymentId}` },
    });

  it('captures a signed delivery exactly once and marks the invoice PAID', async () => {
    const { invoiceId, sessionId } = await seedSession('order-cap-1');
    const payload = capturePayload('payment-cap-1', 'order-cap-1');
    const signature = sign(Buffer.from(JSON.stringify(payload)));

    await sendWebhook(payload, signature).expect(200).expect({ status: 'ok' });

    const session = await prisma.paymentSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.status).toBe(PaymentSessionStatus.CAPTURED);
    expect(session?.providerPaymentId).toBe('payment-cap-1');

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    expect(invoice?.status).toBe(InvoiceStatus.PAID);
    expect(invoice?.amountPaidCents).toBe(12500);

    expect(await outboxCountFor('payment-cap-1')).toBe(1);
  });

  it('rejects an identical replay within the ingress window without a second effect', async () => {
    await seedSession('order-replay-1');
    const payload = capturePayload('payment-replay-1', 'order-replay-1');
    const signature = sign(Buffer.from(JSON.stringify(payload)));

    await sendWebhook(payload, signature).expect(200);
    await sendWebhook(payload, signature).expect(409);

    expect(await outboxCountFor('payment-replay-1')).toBe(1);
  });

  it('treats a delayed duplicate with a different body as a no-op', async () => {
    await seedSession('order-delayed-1');
    const firstPayload = capturePayload('payment-delayed-1', 'order-delayed-1');
    await sendWebhook(
      firstPayload,
      sign(Buffer.from(JSON.stringify(firstPayload))),
    ).expect(200);

    // A retried delivery beyond the replay-dedupe window carries a different
    // raw body, so ingress dedupe cannot catch it; the handler's provider
    // payment id guard must.
    const delayedPayload = capturePayload(
      'payment-delayed-1',
      'order-delayed-1',
      { notes: { delivery: 'retry' } },
    );
    const res = await sendWebhook(
      delayedPayload,
      sign(Buffer.from(JSON.stringify(delayedPayload))),
    ).expect(200);
    expect(res.body).toEqual({ status: 'ok' });

    expect(await outboxCountFor('payment-delayed-1')).toBe(1);
  });

  it('does not mark the invoice PAID when the capture amount does not match the session', async () => {
    const { invoiceId, sessionId } = await seedSession('order-wrong-1');
    const payload = capturePayload('payment-wrong-1', 'order-wrong-1', {
      amount: 999,
    });
    const signature = sign(Buffer.from(JSON.stringify(payload)));

    const res = await sendWebhook(payload, signature).expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.error).toBeTruthy();

    const session = await prisma.paymentSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.status).toBe(PaymentSessionStatus.PENDING);
    expect(session?.providerPaymentId).toBeNull();

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    expect(invoice?.status).toBe(InvoiceStatus.PENDING);

    expect(await outboxCountFor('payment-wrong-1')).toBe(0);
  });

  it('elects exactly one winner among parallel capture claims', async () => {
    const { sessionId, clinicId } = await seedSession('order-parallel-1');

    const claims = await Promise.all(
      Array.from({ length: 5 }, () =>
        sessionRepository.tryMarkCaptured(sessionId, clinicId, {
          status: PaymentSessionStatus.CAPTURED,
          providerPaymentId: 'payment-parallel-1',
          paidAt: new Date(),
        }),
      ),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it('applies exactly one effect when two deliveries race past the ingress', async () => {
    await seedSession('order-e2e-race');
    const payload = capturePayload('payment-e2e-race', 'order-e2e-race');

    const results = await Promise.allSettled([
      webhookService.handle(payload as never, 'signature'),
      webhookService.handle(payload as never, 'signature'),
    ]);

    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);

    expect(await outboxCountFor('payment-e2e-race')).toBe(1);
  });
});
