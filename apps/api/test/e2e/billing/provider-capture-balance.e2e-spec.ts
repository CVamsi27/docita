import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import {
  InvoiceStatus,
  PaymentSessionStatus,
  type PaymentSession,
} from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaTransactionRunner } from '@/prisma/transaction-runner';
import { PrismaInvoiceRepository } from '@/domains/billing/infrastructure/repositories/prisma.invoice.repository';
import { PrismaPaymentSessionRepository } from '@/domains/billing/infrastructure/repositories/prisma.payment-session.repository';
import { INVOICE_REPOSITORY_TOKEN } from '@/domains/billing/core/repositories/invoice.repository';
import { PAYMENT_SESSION_REPOSITORY_TOKEN } from '@/domains/billing/core/repositories/payment-session.repository';
import { InvoiceSettlementService } from '@/domains/billing/application/services/invoice-settlement.service';
import { RazorpayInvoiceWebhookService } from '@/domains/billing/application/services/razorpay-invoice-webhook.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { TRANSACTION_RUNNER_PORT } from '@/shared/common/ports/transaction-runner.port';
import { OutboxService } from '@/shared/modules/outbox/outbox.service';
import {
  closeDatabase,
  getPrismaInstance,
  resetDatabase,
  setupTestDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

describe('Invoice capture balances and currencies (Postgres)', () => {
  let prisma: ReturnType<typeof getPrismaInstance>;
  let moduleFixture: TestingModule;
  let webhook: RazorpayInvoiceWebhookService;
  let settlement: InvoiceSettlementService;
  let outbox: OutboxService;
  let clinicId: string;
  let patientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    setupTestDatabase();
    prisma = getPrismaInstance();
    setPrismaInstance(prisma);
    moduleFixture = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        PrismaInvoiceRepository,
        PrismaPaymentSessionRepository,
        PrismaTransactionRunner,
        {
          provide: INVOICE_REPOSITORY_TOKEN,
          useExisting: PrismaInvoiceRepository,
        },
        {
          provide: PAYMENT_SESSION_REPOSITORY_TOKEN,
          useExisting: PrismaPaymentSessionRepository,
        },
        {
          provide: TRANSACTION_RUNNER_PORT,
          useExisting: PrismaTransactionRunner,
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-10-13T12:00:00.000Z') },
        },
        { provide: Logger, useValue: { debug: () => undefined } },
        OutboxService,
        { provide: 'IOutboxService', useExisting: OutboxService },
        InvoiceSettlementService,
        RazorpayInvoiceWebhookService,
      ],
    }).compile();
    webhook = moduleFixture.get(RazorpayInvoiceWebhookService);
    settlement = moduleFixture.get(InvoiceSettlementService);
    outbox = moduleFixture.get(OutboxService);
  });

  beforeEach(async () => {
    await resetDatabase();
    await prisma.outboxEvent.deleteMany();
    const clinic = await factories.clinic({ currency: 'INR' });
    clinicId = clinic.id;
    const patient = await factories.patient(clinicId);
    patientId = patient.id;
    const invoice = await factories.invoice(patientId, {
      clinicId,
      currency: 'USD',
      total: 100,
      totalCents: 10000,
      grandTotalCents: 10000,
      amountPaidCents: 0,
    });
    invoiceId = invoice.id;
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (moduleFixture) await moduleFixture.close();
    await closeDatabase();
  });

  const createSession = (
    amount: number,
    overrides: {
      currency?: string;
      clinicId?: string;
      invoiceId?: string | null;
    } = {},
  ) =>
    prisma.paymentSession.create({
      data: {
        clinicId,
        patientId,
        invoiceId,
        provider: 'razorpay',
        providerSessionId: `order-${randomUUID()}`,
        amount,
        currency: 'USD',
        ...overrides,
      },
    });

  const capture = (
    session: PaymentSession,
    providerPaymentId = `payment-${randomUUID()}`,
  ) =>
    webhook.applyReconciledCapture(session, {
      providerPaymentId,
      amountPaise: session.amount,
      currency: session.currency,
    });

  const readInvoice = () =>
    prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  it('records manual collections in the persisted invoice currency', async () => {
    await settlement.markInvoicePaidManually({
      invoiceId,
      clinicId,
      performedByUserId: 'synthetic-receptionist',
      paymentMethod: 'CASH',
      amount: 25,
    });

    const session = await prisma.paymentSession.findFirstOrThrow({
      where: { invoiceId },
    });
    expect(session.currency).toBe('USD');
    expect(session.amount).toBe(2500);
    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 2500,
      status: InvoiceStatus.PARTIALLY_PAID,
    });
  });

  it('records a booking advance in the persisted invoice currency', async () => {
    const { user } = await factories.user({ clinicId, role: 'DOCTOR' });
    const appointment = await factories.appointment(
      patientId,
      user.id,
      clinicId,
      {
        advanceAmountCents: 3000,
        advancePaymentMethod: 'CASH',
      },
    );
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { appointmentId: appointment.id },
    });

    await settlement.applyAppointmentAdvance(invoiceId, clinicId);

    const session = await prisma.paymentSession.findFirstOrThrow({
      where: { invoiceId },
    });
    expect(session.currency).toBe('USD');
    expect(session.amount).toBe(3000);
    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 3000,
      status: InvoiceStatus.PARTIALLY_PAID,
    });
  });

  it('updates the collected balance while preserving a partial invoice status', async () => {
    const session = await createSession(2500);

    expect(await capture(session)).toBe(true);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 2500,
      status: InvoiceStatus.PARTIALLY_PAID,
    });
    expect(await prisma.outboxEvent.count()).toBe(1);
  });

  it('records a full provider capture exactly once for simultaneous duplicate deliveries', async () => {
    const session = await createSession(10000);
    const deliveries = await Promise.all([
      capture(session, 'payment-duplicate'),
      capture(session, 'payment-duplicate'),
    ]);

    expect(deliveries.filter(Boolean)).toHaveLength(1);
    const invoice = await readInvoice();
    expect(invoice.amountPaidCents).toBe(10000);
    expect(invoice.totalCents - invoice.amountPaidCents).toBe(0);
    expect(invoice.status).toBe(InvoiceStatus.PAID);
    expect(await prisma.outboxEvent.count()).toBe(1);
  });

  it('accumulates distinct concurrent captures without losing a payment or paid status', async () => {
    const first = await createSession(4000);
    const second = await createSession(6000);

    expect(await Promise.all([capture(first), capture(second)])).toEqual([
      true,
      true,
    ]);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 10000,
      status: InvoiceStatus.PAID,
    });
    expect(
      await prisma.paymentSession.count({
        where: { invoiceId, status: PaymentSessionStatus.CAPTURED },
      }),
    ).toBe(2);
    expect(await prisma.outboxEvent.count()).toBe(2);
  });

  it('accumulates a provider capture racing a manual collection in the invoice currency', async () => {
    const session = await createSession(6000);

    await Promise.all([
      settlement.markInvoicePaidManually({
        invoiceId,
        clinicId,
        performedByUserId: 'synthetic-receptionist',
        paymentMethod: 'CASH',
        amount: 40,
      }),
      capture(session),
    ]);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 10000,
      status: InvoiceStatus.PAID,
    });
    const sessions = await prisma.paymentSession.findMany({
      where: { invoiceId },
    });
    expect(sessions.map((row) => row.currency)).toEqual(['USD', 'USD']);
    expect(sessions.reduce((sum, row) => sum + row.amount, 0)).toBe(10000);
  });

  it('records received money without reopening a cancelled invoice', async () => {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.CANCELLED },
    });
    const session = await createSession(10000);

    expect(await capture(session)).toBe(true);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 10000,
      status: InvoiceStatus.CANCELLED,
    });
    expect(await prisma.outboxEvent.count()).toBe(1);
  });

  it('rejects invoice currency mismatch and retains the uncaptured session for reconciliation', async () => {
    const session = await createSession(10000, { currency: 'INR' });

    await expect(capture(session)).rejects.toThrow(BadRequestException);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 0,
      status: InvoiceStatus.PENDING,
    });
    expect(
      await prisma.paymentSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: PaymentSessionStatus.CREATED,
      providerPaymentId: null,
    });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it('rejects missing legacy invoice context without consuming the capture intent', async () => {
    const session = await createSession(10000, { invoiceId: null });

    await expect(capture(session)).rejects.toThrow(BadRequestException);

    expect(
      await prisma.paymentSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: PaymentSessionStatus.CREATED,
      providerPaymentId: null,
    });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it('refuses a session linked to another tenant invoice and rolls back the capture claim', async () => {
    const otherClinic = await factories.clinic();
    const session = await createSession(10000, { clinicId: otherClinic.id });

    await expect(capture(session)).rejects.toThrow(NotFoundException);

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 0,
      status: InvoiceStatus.PENDING,
    });
    expect(
      await prisma.paymentSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: PaymentSessionStatus.CREATED,
      providerPaymentId: null,
    });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it('fails a stale capture whose invoice was deleted without consuming reconciliation intent', async () => {
    const session = await createSession(10000);
    await prisma.invoice.delete({ where: { id: invoiceId } });

    await expect(capture(session)).rejects.toThrow(NotFoundException);

    expect(
      await prisma.paymentSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: PaymentSessionStatus.CREATED,
      providerPaymentId: null,
    });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it('rolls back the capture claim and invoice balance when outbox persistence fails', async () => {
    const session = await createSession(10000);
    jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('synthetic outbox failure'));

    await expect(capture(session)).rejects.toThrow('synthetic outbox failure');

    expect(await readInvoice()).toMatchObject({
      amountPaidCents: 0,
      status: InvoiceStatus.PENDING,
    });
    expect(
      await prisma.paymentSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ).toMatchObject({
      status: PaymentSessionStatus.CREATED,
      providerPaymentId: null,
    });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });
});
