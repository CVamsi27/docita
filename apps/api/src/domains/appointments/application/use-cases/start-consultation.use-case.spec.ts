import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { StartConsultationUseCase } from './start-consultation.use-case';
import type {
  IAppointmentReadRepository,
  IAppointmentWriteRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

type ConsultationRow = NonNullable<
  Awaited<ReturnType<IAppointmentReadRepository['findForConsultationStart']>>
>;

function makeRow(overrides: Partial<ConsultationRow> = {}): ConsultationRow {
  return {
    id: 'appt-1',
    clinicId: 'clinic-1',
    doctorId: 'doctor-1',
    status: AppointmentStatusEnum.SCHEDULED,
    queueToken: null,
    ...overrides,
  };
}

describe('StartConsultationUseCase', () => {
  let readRepository: {
    findClinicTier: ReturnType<typeof jest.fn>;
    findForConsultationStart: ReturnType<typeof jest.fn>;
  };
  let writeRepository: { startConsultationTx: ReturnType<typeof jest.fn> };
  let useCase: StartConsultationUseCase;

  const command = {
    appointmentId: 'appt-1',
    clinicId: 'clinic-1',
    userId: 'doctor-1',
    role: Role.DOCTOR,
  };

  beforeEach(() => {
    readRepository = {
      findClinicTier: jest.fn(async () => null),
      findForConsultationStart: jest.fn(async () => makeRow()),
    };
    writeRepository = {
      startConsultationTx: jest.fn(async () => undefined),
    };
    useCase = new StartConsultationUseCase(
      readRepository as unknown as IAppointmentReadRepository,
      writeRepository as unknown as IAppointmentWriteRepository,
    );
  });

  it('starts the consultation for the assigned doctor on a scheduled appointment', async () => {
    const result = await useCase.execute(command);

    expect(result).toEqual({ appointmentId: 'appt-1', status: 'in-progress' });
    expect(writeRepository.startConsultationTx).toHaveBeenCalledWith(
      'appt-1',
      'clinic-1',
      null,
      AppointmentStatusEnum.SCHEDULED,
    );
  });

  it('blocks consultation start on the Front Desk plan', async () => {
    readRepository.findClinicTier.mockResolvedValueOnce({
      tier: 'FRONT_DESK',
      planMode: 'FRONT_DESK',
    });

    await expect(useCase.execute(command)).rejects.toThrow(ForbiddenException);
    expect(readRepository.findForConsultationStart).not.toHaveBeenCalled();
    expect(writeRepository.startConsultationTx).not.toHaveBeenCalled();
  });

  it('rejects a non-doctor role before touching the appointment', async () => {
    await expect(
      useCase.execute({ ...command, role: Role.RECEPTIONIST }),
    ).rejects.toThrow(ForbiddenException);
    expect(readRepository.findForConsultationStart).not.toHaveBeenCalled();
  });

  it('throws NotFound when the appointment does not exist', async () => {
    readRepository.findForConsultationStart.mockResolvedValueOnce(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundException);
    expect(writeRepository.startConsultationTx).not.toHaveBeenCalled();
  });

  it('forbids a doctor from starting another doctor’s appointment', async () => {
    readRepository.findForConsultationStart.mockResolvedValueOnce(
      makeRow({ doctorId: 'doctor-2' }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(ForbiddenException);
    expect(writeRepository.startConsultationTx).not.toHaveBeenCalled();
  });

  it('rejects starting a cancelled appointment (loophole guard)', async () => {
    readRepository.findForConsultationStart.mockResolvedValueOnce(
      makeRow({ status: AppointmentStatusEnum.CANCELLED }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(BadRequestException);
    expect(writeRepository.startConsultationTx).not.toHaveBeenCalled();
  });

  it('rejects re-starting a completed appointment (loophole guard)', async () => {
    readRepository.findForConsultationStart.mockResolvedValueOnce(
      makeRow({ status: AppointmentStatusEnum.COMPLETED }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(BadRequestException);
    expect(writeRepository.startConsultationTx).not.toHaveBeenCalled();
  });

  it('allows ADMIN_DOCTOR and in-progress resumes', async () => {
    readRepository.findForConsultationStart.mockResolvedValueOnce(
      makeRow({ status: AppointmentStatusEnum.IN_PROGRESS }),
    );

    await expect(
      useCase.execute({ ...command, role: Role.ADMIN_DOCTOR }),
    ).resolves.toEqual({ appointmentId: 'appt-1', status: 'in-progress' });
  });

  it('maps a lost-row transaction error to NotFound', async () => {
    writeRepository.startConsultationTx.mockRejectedValueOnce(
      new Error('Appointment with ID appt-1 not found'),
    );

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundException);
  });
});
