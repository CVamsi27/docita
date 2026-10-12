import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';
import { asType } from '@/test-utils';
import { assertTenantQualifiedRead } from '@/test-utils/tenant-qualified-read';
import type { WhatsappPersistencePort } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { StaffNotificationListener } from './staff-notification.listener';

describe('StaffNotificationListener tenant reads', () => {
  const invoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-1',
    grandTotal: 500,
    currency: 'INR',
    patient: { firstName: 'Synthetic', lastName: 'Patient' },
  };
  const notifyStaff = jest.fn<StaffNotificationService['notifyStaff']>();

  function buildListener(record: typeof invoice | null = invoice) {
    return new StaffNotificationListener(
      asType<StaffNotificationService>({ notifyStaff }),
      asType<WhatsappPersistencePort>({
        invoice: {
          findUnique: async (args: unknown) => {
            assertTenantQualifiedRead('Invoice', args, 'clinic-1');
            return record;
          },
        },
      }),
    );
  }

  beforeEach(() => {
    notifyStaff.mockReset();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('delivers the existing invoice notification through tenant enforcement', async () => {
    await buildListener().onInvoiceGenerated({
      invoiceId: 'invoice-1',
      clinicId: 'clinic-1',
    });

    expect(notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        type: 'INVOICE_PENDING',
        message: 'Invoice generated for Synthetic Patient.',
        data: expect.objectContaining({ invoiceId: 'invoice-1' }),
      }),
    );
  });

  it.each(['missing', 'other-clinic'])(
    'does not notify for a %s record',
    async (scenario) => {
      await buildListener(
        scenario === 'missing' ? null : invoice,
      ).onInvoiceGenerated({
        invoiceId: 'invoice-1',
        clinicId: scenario === 'other-clinic' ? 'clinic-other' : 'clinic-1',
      });
      expect(notifyStaff).not.toHaveBeenCalled();
    },
  );
});
