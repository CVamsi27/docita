import { Logger } from '@nestjs/common';
import { asType } from '@/test-utils';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  createEvent,
  DomainEvents,
} from '@/shared/common/events/domain-events';
import { AuditEventListener } from './audit-event.listener';

describe('AuditEventListener diagnostic privacy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists the audit payload without writing it to development logs', async () => {
    const debug = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const listener = new AuditEventListener(
      asType<PrismaService>({
        runUnrestricted: async (fn: () => Promise<void>) => fn(),
        auditLog: { create },
      }),
      asType<AppConfigService>({ isDevelopment: () => true }),
    );
    await listener.handleDomainEvent(
      createEvent(
        DomainEvents.PATIENT_CREATED,
        {
          patientId: 'patient-1',
          firstName: 'SYNTHETIC_PHI_NAME',
          lastName: 'SYNTHETIC_PHI_SURNAME',
          phoneNumber: 'SYNTHETIC_PHI_PHONE',
        },
        {
          clinicId: 'clinic-1',
          userId: 'user-1',
          source: 'test',
          correlationId: 'correlation-1',
          timestamp: new Date('2026-10-12T00:00:00Z'),
        },
      ),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: 'patient-1',
          userId: 'user-1',
          clinicId: 'clinic-1',
          metadata: expect.objectContaining({
            payload: expect.objectContaining({
              firstName: 'SYNTHETIC_PHI_NAME',
              phoneNumber: 'SYNTHETIC_PHI_PHONE',
            }),
          }),
        }),
      }),
    );
    const logs = JSON.stringify(debug.mock.calls);
    expect(logs).toContain('correlation-1');
    expect(logs).not.toContain('SYNTHETIC_PHI');
  });
});
