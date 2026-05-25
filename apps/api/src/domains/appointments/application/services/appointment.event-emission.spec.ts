import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { IAppointmentRepository } from '@/domains/appointments/core/repositories/appointment.repository.interface';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { CreateAppointmentCommand } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import { createStubAppointmentWriteUseCases } from './appointment-use-case.stubs';

describe('AppointmentService - appointment.created event', () => {
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
  const executeMock = jest.fn<CreateAppointmentUseCase['execute']>();
  mockCreateAppointmentUseCase.execute = executeMock;

  const mockPrisma = Object.create(
    Object.prototype,
  ) as AppointmentPersistencePort;

  const mockEventEmitter = Object.create(
    EventEmitter2.prototype,
  ) as EventEmitter2;
  const emitMock = jest
    .fn<EventEmitter2['emit']>()
    .mockImplementation(() => true);
  mockEventEmitter.emit = emitMock;

  const mockSchedulingRules = {
    validateAppointmentOverlap: jest
      .fn<AppointmentSchedulingRulesService['validateAppointmentOverlap']>()
      .mockResolvedValue({ hasConflict: false }),
  } as unknown as AppointmentSchedulingRulesService;

  const command: CreateAppointmentCommand = {
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date('2026-04-01T10:00:00.000Z'),
    endTime: new Date('2026-04-01T10:30:00.000Z'),
  };

  let service: AppointmentService;

  const writeUseCaseStubs = createStubAppointmentWriteUseCases();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentService(
      mockRepository,
      mockRepository,
      mockCreateAppointmentUseCase,
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

  it('emits appointment.created after successful appointment creation', async () => {
    const created = new Appointment({
      id: 'appt-1',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startTime: command.startTime,
      endTime: command.endTime,
      status: AppointmentStatus.scheduled(),
      notes: undefined,
      consultationNotes: undefined,
      observations: undefined,
      chiefComplaint: undefined,
      treatmentHistory: undefined,
      clinicalImpression: undefined,
      differentialDiagnosis: undefined,
      finalDiagnosis: undefined,
      followUpPlan: undefined,
      type: 'consultation',
      createdAt: new Date('2026-04-01T09:55:00.000Z'),
      updatedAt: new Date('2026-04-01T09:55:00.000Z'),
      version: 1,
    });

    executeMock.mockImplementation(async () => created);

    const result = await service.createAppointment(command);

    expect(result).toBe(created);
    expect(emitMock).toHaveBeenCalledWith(
      ApplicationEvents.APPOINTMENT_CREATED,
      expect.objectContaining({
        appointmentId: 'appt-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        appointment: created,
      }),
    );
  });
});
