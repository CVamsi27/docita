import { PatientAppointmentResolverService } from './patient-appointment-resolver.service';
import { AppointmentStatus } from '@workspace/db';
describe('PatientAppointmentResolverService', () => {
  const now = new Date('2026-05-29T12:00:00.000Z');

  const persistence = {
    whatsappLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const clock = { now: jest.fn(() => now) };

  let service: PatientAppointmentResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PatientAppointmentResolverService(
      persistence as never,
      clock as never,
    );
  });

  it('resolves appointment from reply context provider message id', async () => {
    persistence.whatsappLog.findFirst.mockResolvedValue({
      requestBody: { appointmentId: 'appt-ctx' },
    });
    persistence.appointment.findUnique.mockResolvedValue({
      id: 'appt-ctx',
      startTime: now,
      patient: {
        firstName: 'A',
        lastName: 'B',
        phoneNumber: '+911234567890',
      },
      doctor: { id: 'doc-1', name: 'Dr. Smith' },
      clinic: { id: 'clinic-1', name: 'Clinic' },
    });

    const result = await service.resolveForInboundMessage({
      phoneNumber: '+911234567890',
      contextProviderMessageId: 'wamid.ctx',
    });

    expect(persistence.whatsappLog.findFirst).toHaveBeenCalledWith({
      where: { providerMessageId: 'wamid.ctx' },
      select: { requestBody: true },
    });
    expect(result?.id).toBe('appt-ctx');
    expect(persistence.patient.findFirst).not.toHaveBeenCalled();
  });

  it('resolves nearest upcoming appointment when multiple candidates exist', async () => {
    persistence.whatsappLog.findFirst.mockResolvedValue(null);
    persistence.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    persistence.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-far',
        startTime: new Date('2026-06-01T10:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
        patient: {
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+911234567890',
        },
        doctor: { id: 'doc-1', name: 'Dr. Smith' },
        clinic: { id: 'clinic-1', name: 'Clinic' },
      },
      {
        id: 'appt-near',
        startTime: new Date('2026-05-29T14:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
        patient: {
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+911234567890',
        },
        doctor: { id: 'doc-1', name: 'Dr. Smith' },
        clinic: { id: 'clinic-1', name: 'Clinic' },
      },
    ]);
    persistence.whatsappLog.findMany.mockResolvedValue([]);

    const result = await service.resolveForInboundMessage({
      phoneNumber: '+911234567890',
    });

    expect(result?.id).toBe('appt-near');
  });

  it('prefers appointment linked in recent outbound log when ambiguous', async () => {
    persistence.whatsappLog.findFirst.mockResolvedValue(null);
    persistence.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    persistence.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-a',
        startTime: new Date('2026-05-29T14:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
        patient: {
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+911234567890',
        },
        doctor: { id: 'doc-1', name: 'Dr. Smith' },
        clinic: { id: 'clinic-1', name: 'Clinic' },
      },
      {
        id: 'appt-b',
        startTime: new Date('2026-05-29T16:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
        patient: {
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '+911234567890',
        },
        doctor: { id: 'doc-1', name: 'Dr. Smith' },
        clinic: { id: 'clinic-1', name: 'Clinic' },
      },
    ]);
    persistence.whatsappLog.findMany.mockResolvedValue([
      {
        requestBody: { appointmentId: 'appt-b' },
        createdAt: now,
      },
    ]);

    const result = await service.resolveForInboundMessage({
      phoneNumber: '+911234567890',
    });

    expect(result?.id).toBe('appt-b');
    expect(persistence.whatsappLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: 'patient-1' }),
      }),
    );
  });
});
