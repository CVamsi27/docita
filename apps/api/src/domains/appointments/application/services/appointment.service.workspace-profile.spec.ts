import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@workspace/db';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';

describe('AppointmentService workspace profile', () => {
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
    findClinicWorkspaceProfile:
      jest.fn<IAppointmentRepository['findClinicWorkspaceProfile']>(),
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
  } as unknown as PrismaService;

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

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentService(
      mockRepository,
      mockCreateAppointmentUseCase,
      mockPrisma,
      mockEventEmitter,
      mockSchedulingRules,
      Object.create(
        AppointmentMetricsService.prototype,
      ) as AppointmentMetricsService,
      Object.create(
        AppointmentDiagnosisService.prototype,
      ) as AppointmentDiagnosisService,
    );
  });

  it('forbids startConsultation when clinic workspace is FRONT_DESK', async () => {
    mockRepository.findClinicWorkspaceProfile.mockImplementation(async () => ({
      settings: { workspaceProfile: 'FRONT_DESK' },
    }));

    await expect(
      service.startConsultation('apt-1', 'clinic-1', {
        userId: 'doctor-1',
        role: Role.DOCTOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mockAppointmentFindFirst).not.toHaveBeenCalled();
  });
});
