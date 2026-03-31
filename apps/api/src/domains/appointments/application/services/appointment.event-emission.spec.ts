import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';

describe('AppointmentService - appointment.created event', () => {
  const mockRepository = {};
  const mockPrisma = {};

  const mockCreateAppointmentUseCase: { execute: jest.Mock } = {
    execute: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn<(...args: unknown[]) => unknown>(),
  };

  let service: AppointmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentService(
      mockRepository as never,
      mockCreateAppointmentUseCase as unknown as CreateAppointmentUseCase,
      mockPrisma as never,
      mockEventEmitter as never,
    );
  });

  it('emits appointment.created after successful appointment creation', async () => {
    const created = {
      id: 'appt-1',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
    } as Appointment;

    mockCreateAppointmentUseCase.execute.mockImplementation(
      async () => created,
    );

    const command = {
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startTime: new Date('2026-04-01T10:00:00.000Z'),
      endTime: new Date('2026-04-01T10:30:00.000Z'),
    };

    const result = await service.createAppointment(command);

    expect(result).toBe(created);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'appointment.created',
      expect.objectContaining({
        appointmentId: 'appt-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        appointment: created,
      }),
    );
  });
});
