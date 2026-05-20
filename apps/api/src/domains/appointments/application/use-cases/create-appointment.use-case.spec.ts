import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CreateAppointmentUseCase } from './create-appointment.use-case';
import type { IAppointmentWriteRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('CreateAppointmentUseCase', () => {
  const writeRepository = {
    save: jest.fn<IAppointmentWriteRepository['save']>(),
  } as unknown as jest.Mocked<IAppointmentWriteRepository>;

  const validateOverlapMock =
    jest.fn<AppointmentSchedulingRulesService['validateAppointmentOverlap']>();

  const schedulingRules = {
    validateAppointmentOverlap: validateOverlapMock,
  } as unknown as AppointmentSchedulingRulesService;

  let useCase: CreateAppointmentUseCase;
  const fixedNow = new Date('2026-05-19T12:00:00.000Z');
  const clock: IClock = { now: () => fixedNow };

  const command = {
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-05-10T10:00:00.000Z'),
    endTime: new Date('2026-05-10T10:30:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateAppointmentUseCase(
      writeRepository,
      schedulingRules,
      clock,
    );
  });

  it('throws when the doctor has an overlapping visit', async () => {
    validateOverlapMock.mockResolvedValueOnce({
      hasConflict: true,
      conflict: {
        id: 'existing-1',
        startTime: new Date('2026-05-10T10:15:00.000Z'),
        endTime: new Date('2026-05-10T10:45:00.000Z'),
      },
    });

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(writeRepository.save).not.toHaveBeenCalled();
  });

  it('persists when no overlap is reported', async () => {
    validateOverlapMock.mockResolvedValueOnce({ hasConflict: false });
    writeRepository.save.mockResolvedValueOnce(undefined);

    const appointment = await useCase.execute(command);

    expect(appointment.clinicId).toBe(command.clinicId);
    expect(writeRepository.save).toHaveBeenCalledTimes(1);
    expect(validateOverlapMock).toHaveBeenCalledWith(
      command.doctorId,
      command.clinicId,
      command.startTime,
      command.endTime,
    );
  });
});
