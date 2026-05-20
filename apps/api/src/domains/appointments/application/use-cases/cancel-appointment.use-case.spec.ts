import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { IAppointmentWriteRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('CancelAppointmentUseCase', () => {
  let useCase: CancelAppointmentUseCase;
  let writeRepository: { update: ReturnType<typeof jest.fn> };
  const clock: IClock = {
    now: () => new Date('2026-05-19T12:00:00.000Z'),
  };

  beforeEach(() => {
    writeRepository = {
      update: jest
        .fn<IAppointmentWriteRepository['update']>()
        .mockResolvedValue(undefined),
    };
    useCase = new CancelAppointmentUseCase(
      writeRepository as unknown as IAppointmentWriteRepository,
      clock,
    );
  });

  it('cancels and persists the appointment', async () => {
    const appointment = new Appointment({
      id: 'appt-1',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startTime: new Date('2026-05-16T09:00:00Z'),
      endTime: new Date('2026-05-16T09:30:00Z'),
      status: AppointmentStatus.scheduled(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    const result = await useCase.execute({
      appointment,
      reason: 'Patient requested',
    });

    expect(result.getStatus().isCancelled()).toBe(true);
    expect(writeRepository.update).toHaveBeenCalledWith(appointment);
  });
});
