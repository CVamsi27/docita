import { WhatsappLogStatus } from '@workspace/db';
import { resolveAppointmentMapsLink, logOutboundPatientTemplate } from './system-events.helpers';

describe('resolveAppointmentMapsLink', () => {
  it('returns custom mapsLink when present and valid', () => {
    const settings = {
      mapsLink: 'https://maps.app.goo.gl/abc123',
    };
    expect(resolveAppointmentMapsLink(settings)).toBe('https://maps.app.goo.gl/abc123');
  });

  it('returns Google Maps URL from mapsLocation when mapsLink is absent', () => {
    const settings = {
      mapsLocation: { lat: 28.6139, lng: 77.209 },
    };
    const result = resolveAppointmentMapsLink(settings);
    expect(result).toBe('https://www.google.com/maps?q=28.6139,77.209');
  });

  it('prefers mapsLink over mapsLocation', () => {
    const settings = {
      mapsLink: 'https://custom.link/clinic',
      mapsLocation: { lat: 28.6139, lng: 77.209 },
    };
    expect(resolveAppointmentMapsLink(settings)).toBe('https://custom.link/clinic');
  });

  it('returns empty string when no maps config is present', () => {
    expect(resolveAppointmentMapsLink({})).toBe('');
  });

  it('returns empty string for null settings', () => {
    expect(resolveAppointmentMapsLink(null)).toBe('');
  });

  it('returns empty string for undefined settings', () => {
    expect(resolveAppointmentMapsLink(undefined)).toBe('');
  });

  it('returns empty string for invalid settings shape', () => {
    expect(resolveAppointmentMapsLink('not-an-object')).toBe('');
  });

  it('trims whitespace from mapsLink', () => {
    const settings = {
      mapsLink: '  https://maps.example.com/clinic  ',
    };
    expect(resolveAppointmentMapsLink(settings)).toBe('https://maps.example.com/clinic');
  });

  it('ignores empty string mapsLink and falls back to mapsLocation', () => {
    const settings = {
      mapsLink: '',
      mapsLocation: { lat: 19.076, lng: 72.8777 },
    };
    const result = resolveAppointmentMapsLink(settings);
    expect(result).toBe('https://www.google.com/maps?q=19.076,72.8777');
  });
});

describe('logOutboundPatientTemplate', () => {
  it('creates a whatsapp log entry with correct data', async () => {
    const createMock = jest.fn().mockResolvedValue({});
    const persistence = {
      whatsappLog: { create: createMock },
    } as any;

    await logOutboundPatientTemplate(persistence, {
      clinicId: 'clinic-1',
      patientId: 'pat-1',
      phoneNumber: '9876543210',
      templateId: 'appointment_reminder',
      appointmentId: 'apt-1',
      sendResult: {
        messageId: 'msg-abc',
        providerMessageId: 'msg-123',
        senderMode: 'SHARED',
        senderPhoneNumberId: 'phone-1',
      },
      variables: { patientName: 'John', date: '2026-07-25' },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const callData = createMock.mock.calls[0][0].data;
    expect(callData.clinicId).toBe('clinic-1');
    expect(callData.patientId).toBe('pat-1');
    expect(callData.phoneNumber).toBe('9876543210');
    expect(callData.message).toBe('Sent template: appointment_reminder');
    expect(callData.type).toBe('appointment_reminder');
    expect(callData.status).toBe(WhatsappLogStatus.SENT);
    expect(callData.providerMessageId).toBe('msg-123');
    expect(callData.senderMode).toBe('SHARED');
    expect(callData.senderPhoneNumberId).toBe('phone-1');
    expect(callData.requestBody).toEqual({
      appointmentId: 'apt-1',
      templateId: 'appointment_reminder',
      variables: { patientName: 'John', date: '2026-07-25' },
    });
  });

  it('uses default SHARED senderMode when sendResult has no senderMode', async () => {
    const createMock = jest.fn().mockResolvedValue({});
    const persistence = {
      whatsappLog: { create: createMock },
    } as any;

    await logOutboundPatientTemplate(persistence, {
      clinicId: 'clinic-1',
      patientId: 'pat-1',
      phoneNumber: '1234567890',
      templateId: 'follow_up',
      appointmentId: 'apt-2',
      sendResult: { messageId: 'msg-def', providerMessageId: '' },
      variables: {},
    });

    const callData = createMock.mock.calls[0][0].data;
    expect(callData.providerMessageId).toBeNull();
    expect(callData.senderMode).toBe('SHARED');
    expect(callData.senderPhoneNumberId).toBeNull();
  });
});
