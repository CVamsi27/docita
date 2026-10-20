import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventService } from './event.service';
import { DomainEvents, type DomainEvent } from './domain-events';

describe('DomainEventService diagnostic privacy', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['emit', 'emitAsync'] as const)(
    '%s preserves patient event data without writing it to diagnostic logs',
    async (method) => {
      const debug = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation(() => undefined);
      const emitter = new EventEmitter2();
      const delivered: DomainEvent[] = [];
      emitter.on(DomainEvents.PATIENT_CREATED, (event: DomainEvent) => {
        delivered.push(event);
      });
      const service = new DomainEventService(emitter, {
        now: () => new Date('2026-10-12T00:00:00Z'),
      });
      await service[method](
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
        },
      );

      expect(delivered).toHaveLength(1);
      expect(delivered[0].payload).toEqual({
        patientId: 'patient-1',
        firstName: 'SYNTHETIC_PHI_NAME',
        lastName: 'SYNTHETIC_PHI_SURNAME',
        phoneNumber: 'SYNTHETIC_PHI_PHONE',
      });
      const logs = JSON.stringify(debug.mock.calls);
      expect(logs).toContain('correlation-1');
      expect(logs).toContain('patient.created');
      expect(logs).not.toContain('SYNTHETIC_PHI');
    },
  );
});
