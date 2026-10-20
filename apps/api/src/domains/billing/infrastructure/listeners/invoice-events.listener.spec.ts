import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';
import { asType } from '@/test-utils';
import { assertTenantQualifiedRead } from '@/test-utils/tenant-qualified-read';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { InvoiceEventsListener } from './invoice-events.listener';

describe('InvoiceEventsListener tenant reads', () => {
  const invoice = {
    id: 'invoice-1',
    patientId: 'patient-1',
    total: 500,
    patient: { id: 'patient-1', phoneNumber: 'synthetic-phone' },
    paymentSessions: [],
  };
  const createPaymentSession =
    jest.fn<PaymentsService['createPaymentSession']>();

  function buildListener(record: typeof invoice | null = invoice) {
    return new InvoiceEventsListener(
      asType<PrismaService>({
        invoice: {
          findUnique: async (args: unknown) => {
            assertTenantQualifiedRead('Invoice', args, 'clinic-1');
            return record;
          },
        },
        clinic: {
          findUnique: async () => ({
            name: 'Synthetic Clinic',
            currency: 'INR',
          }),
        },
      }),
      asType<PaymentsService>({ createPaymentSession }),
      asType<AppConfigService>({ getCurrencyCode: () => 'INR' }),
    );
  }

  beforeEach(() => {
    createPaymentSession.mockReset();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('creates the existing payment session through tenant enforcement', async () => {
    await buildListener().handleInvoiceGeneratedEvent(
      asType<InvoiceGeneratedEvent>({
        invoiceId: 'invoice-1',
        clinicId: 'clinic-1',
      }),
    );
    expect(createPaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'invoice-1',
        clinicId: 'clinic-1',
        amount: 500,
      }),
    );
  });

  it('does not create a payment session for an absent invoice', async () => {
    await buildListener(null).handleInvoiceGeneratedEvent(
      asType<InvoiceGeneratedEvent>({
        invoiceId: 'invoice-missing',
        clinicId: 'clinic-1',
      }),
    );
    expect(createPaymentSession).not.toHaveBeenCalled();
  });

  it('rejects an event clinic that differs from the tenant', async () => {
    await expect(
      buildListener().handleInvoiceGeneratedEvent(
        asType<InvoiceGeneratedEvent>({
          invoiceId: 'invoice-1',
          clinicId: 'clinic-other',
        }),
      ),
    ).rejects.toThrow('Security Violation');
    expect(createPaymentSession).not.toHaveBeenCalled();
  });
});
