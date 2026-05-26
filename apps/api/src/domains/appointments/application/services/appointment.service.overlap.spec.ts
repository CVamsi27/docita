import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentUseCase,
  type CreateAppointmentCommand,
} from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import { createStubAppointmentWriteUseCases } from './appointment-use-case.stubs';

describe('AppointmentService overlap enforcement', () => {
  const mockRepository = {
    findAll: jest.fn<IAppointmentRepository['findAll']>(),
    findById: jest.fn<IAppointmentRepository['findById']>(),
    save: jest.fn<IAppointmentRepository['save']>(),
    update: jest.fn<IAppointmentRepository['update']>(),
    delete: jest.fn<IAppointmentRepository['delete']>(),
    findByPatientId: jest.fn<IAppointmentRepository['findByPatientId']>(),
    findByDoctorId: jest.fn<IAppointmentRepository['findByDoctorId']>(),
    exists: jest.fn<IAppointmentRepository['exists']>(),
    findAppointmentsForSlots:
      jest.fn<IAppointmentRepository['findAppointmentsForSlots']>(),
    findClinicTier: jest.fn<IAppointmentRepository['findClinicTier']>(),
    findForConsultationStart:
      jest.fn<IAppointmentRepository['findForConsultationStart']>(),
    startConsultationTx:
      jest.fn<IAppointmentRepository['startConsultationTx']>(),
    findForUpdate: jest.fn<IAppointmentRepository['findForUpdate']>(),
    applyPatch: jest.fn<IAppointmentRepository['applyPatch']>(),
  } satisfies IAppointmentRepository;

  const mockPrisma = Object.create(
    Object.prototype,
  ) as AppointmentPersistencePort;

  const mockEventEmitter = Object.create(
    EventEmitter2.prototype,
  ) as EventEmitter2;
  mockEventEmitter.emit = jest
    .fn<EventEmitter2['emit']>()
    .mockImplementation(() => true);

  const validateOverlapMock =
    jest.fn<AppointmentSchedulingRulesService['validateAppointmentOverlap']>();

  const schedulingRules = {
    validateAppointmentOverlap: validateOverlapMock,
  } as unknown as AppointmentSchedulingRulesService;

  const clock = { now: () => new Date('2026-05-19T12:00:00.000Z') };

  const createAppointmentUseCase = new CreateAppointmentUseCase(
    mockRepository,
    schedulingRules,
    clock,
  );

  const command: CreateAppointmentCommand = {
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-05-10T10:00:00.000Z'),
    endTime: new Date('2026-05-10T10:30:00.000Z'),
  };

  let service: AppointmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    const writeUseCaseStubs = createStubAppointmentWriteUseCases();

    service = new AppointmentService(
      mockRepository,
      mockRepository,
      createAppointmentUseCase,
      writeUseCaseStubs.cancelAppointmentUseCase,
      writeUseCaseStubs.rescheduleAppointmentUseCase,
      writeUseCaseStubs.startConsultationUseCase,
      writeUseCaseStubs.updateAppointmentDetailsUseCase,
      mockPrisma,
      mockEventEmitter,
      Object.create(
        AppointmentMetricsService.prototype,
      ) as AppointmentMetricsService,
      Object.create(
        AppointmentDiagnosisService.prototype,
      ) as AppointmentDiagnosisService,
    );
  });

  it('throws before persistence when the doctor already has an overlapping visit', async () => {
    validateOverlapMock.mockResolvedValueOnce({
      hasConflict: true,
      conflict: {
        id: 'existing-1',
        startTime: new Date('2026-05-10T10:15:00.000Z'),
        endTime: new Date('2026-05-10T10:45:00.000Z'),
      },
    });

    await expect(service.createAppointment(command)).rejects.toThrow(
      'Bad Request Exception',
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(validateOverlapMock).toHaveBeenCalledWith(
      command.doctorId,
      command.clinicId,
      command.startTime,
      command.endTime,
    );
  });

  it('persists when no overlap is reported', async () => {
    validateOverlapMock.mockResolvedValueOnce({ hasConflict: false });

    mockRepository.save.mockResolvedValueOnce(undefined);

    const result = await service.createAppointment(command);

    expect(result.clinicId).toBe(command.clinicId);
    expect(result.doctorId).toBe(command.doctorId);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
