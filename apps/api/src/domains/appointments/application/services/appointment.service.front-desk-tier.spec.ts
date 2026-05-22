import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@workspace/db';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import { StartConsultationUseCase } from '@/domains/appointments/application/use-cases/start-consultation.use-case';
import { createStubAppointmentWriteUseCases } from './appointment-use-case.stubs';

describe('AppointmentService front desk tier', () => {
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

  const mockCreateAppointmentUseCase = Object.create(
    CreateAppointmentUseCase.prototype,
  ) as CreateAppointmentUseCase;
  mockCreateAppointmentUseCase.execute =
    jest.fn<CreateAppointmentUseCase['execute']>();

  const mockClinicFindUnique = jest.fn(
    async (): Promise<{ settings?: Record<string, unknown> } | null> => null,
  );
  const mockAppointmentFindFirst = jest.fn(async (): Promise<unknown> => null);

  const mockPrisma = {
    clinic: { findUnique: mockClinicFindUnique },
    appointment: { findFirst: mockAppointmentFindFirst },
  } as unknown as AppointmentPersistencePort;

  const mockEventEmitter = Object.create(
    EventEmitter2.prototype,
  ) as EventEmitter2;
  mockEventEmitter.emit = jest
    .fn<EventEmitter2['emit']>()
    .mockImplementation(() => true);

  const mockSchedulingRules = {
    validateAppointmentOverlap: jest
      .fn<AppointmentSchedulingRulesService['validateAppointmentOverlap']>()
      .mockResolvedValue({ hasConflict: false }),
  } as unknown as AppointmentSchedulingRulesService;

  let service: AppointmentService;
  let startConsultationUseCase: StartConsultationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    const writeUseCaseStubs = createStubAppointmentWriteUseCases();
    startConsultationUseCase = new StartConsultationUseCase(
      mockRepository,
      mockRepository,
    );

    service = new AppointmentService(
      mockRepository,
      mockRepository,
      mockCreateAppointmentUseCase,
      writeUseCaseStubs.cancelAppointmentUseCase,
      writeUseCaseStubs.rescheduleAppointmentUseCase,
      startConsultationUseCase,
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

  it('forbids startConsultation when clinic tier is FRONT_DESK', async () => {
    mockRepository.findClinicTier.mockResolvedValue({
      tier: 'FRONT_DESK',
    });

    await expect(
      service.startConsultation('apt-1', 'clinic-1', {
        userId: 'doctor-1',
        role: Role.DOCTOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mockRepository.findForConsultationStart).not.toHaveBeenCalled();
  });
});
