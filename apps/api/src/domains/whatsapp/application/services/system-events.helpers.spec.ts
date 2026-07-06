import { describe, expect, it, jest } from '@jest/globals';
import { WhatsappLogStatus } from '@workspace/db';
import {
  logOutboundPatientTemplate,
  resolveAppointmentMapsLink,
} from './system-events.helpers';
import type { WhatsappPersistencePort } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import type { SendMessageResult } from '@/domains/whatsapp/application/use-cases/send-message.use-case';

describe('resolveAppointmentMapsLink', () => {
  it('prefers a trimmed custom maps link', () => {
    expect(
      resolveAppointmentMapsLink({ mapsLink: '  https://maps.example/x  ' }),
    ).toBe('https://maps.example/x');
  });

  it('builds a Google Maps URL from lat/lng when no custom link exists', () => {
    expect(
      resolveAppointmentMapsLink({ mapsLocation: { lat: 12.97, lng: 77.59 } }),
    ).toBe('https://www.google.com/maps?q=12.97,77.59');
  });

  it('returns an empty string when neither is configured', () => {
    expect(resolveAppointmentMapsLink({})).toBe('');
  });

  it('returns an empty string for unparseable settings', () => {
    expect(resolveAppointmentMapsLink('not-settings')).toBe('');
  });
});

describe('logOutboundPatientTemplate', () => {
  function makeCtx() {
    const create = jest.fn<(args: { data: unknown }) => Promise<unknown>>(
      async () => ({}),
    );
    const persistence = {
      whatsappLog: { create },
    } as unknown as WhatsappPersistencePort;
    return { persistence, create };
  }

  const baseParams = {
    clinicId: 'c-1',
    patientId: 'p-1',
    phoneNumber: '+910000000000',
    templateId: 'appointment_reminder',
    appointmentId: 'appt-1',
    variables: { name: 'Asha' },
  };

  it('writes a SENT log with provider metadata', async () => {
    const { persistence, create } = makeCtx();
    const sendResult = {
      providerMessageId: 'wamid.1',
      senderMode: 'OWN',
      senderPhoneNumberId: 'pn-1',
    } as unknown as SendMessageResult;

    await logOutboundPatientTemplate(persistence, {
      ...baseParams,
      sendResult,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'c-1',
        patientId: 'p-1',
        status: WhatsappLogStatus.SENT,
        type: 'appointment_reminder',
        providerMessageId: 'wamid.1',
        senderMode: 'OWN',
        senderPhoneNumberId: 'pn-1',
      }),
    });
  });

  it('defaults sender metadata when the send result omits it', async () => {
    const { persistence, create } = makeCtx();
    const sendResult = {
      providerMessageId: '',
    } as unknown as SendMessageResult;

    await logOutboundPatientTemplate(persistence, {
      ...baseParams,
      sendResult,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerMessageId: null,
        senderMode: 'SHARED',
        senderPhoneNumberId: null,
      }),
    });
  });
});
