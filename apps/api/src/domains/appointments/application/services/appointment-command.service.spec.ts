import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { AppointmentCommandService } from './appointment-command.service';
import { AppointmentQueryService } from './appointment-query.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentSchedulingRulesService } from '@/domains/appointments/core/domain-services/appointment-scheduling-rules.service';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';

describe('AppointmentCommandService', () => {
  let service: AppointmentCommandService;
  let queryService: jest.Mocked<AppointmentQueryService>;
  let createUseCase: jest.Mocked<CreateAppointmentUseCase>;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let schedulingRules: jest.Mocked<AppointmentSchedulingRulesService>;
  let metricsService: jest.Mocked<AppointmentMetricsService>;
  let diagnosisService: jest.Mocked<AppointmentDiagnosisService>;

  beforeEach(() => {
    queryService = Object.create(AppointmentQueryService.prototype) as jest.Mocked<AppointmentQueryService>;
    queryService.getAppointment = jest.fn();

    createUseCase = Object.create(CreateAppointmentUseCase.prototype) as jest.Mocked<CreateAppointmentUseCase>;
    createUseCase.execute = jest.fn();

    prisma = {
      clinic: { findUnique: jest.fn() },
      appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    schedulingRules = Object.create(AppointmentSchedulingRulesService.prototype) as jest.Mocked<AppointmentSchedulingRulesService>;
    schedulingRules.validateAppointmentOverlap = jest.fn();

    metricsService = Object.create(AppointmentMetricsService.prototype) as jest.Mocked<AppointmentMetricsService>;
    metricsService.recordObservationMetrics = jest.fn();

    diagnosisService = Object.create(AppointmentDiagnosisService.prototype) as jest.Mocked<AppointmentDiagnosisService>;
    diagnosisService.syncDiagnoses = jest.fn();

    service = new AppointmentCommandService(
      queryService,
      { findById: jest.fn(), update: jest.fn() } as never,
      createUseCase,
      prisma,
      eventEmitter,
      schedulingRules,
      metricsService,
      diagnosisService,
    );
  });

  describe('createAppointment', () => {
    it('should create an appointment when no overlap exists', async () => {
      const command = {
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        startTime: new Date('2026-05-16T09:00:00Z'),
        endTime: new Date('2026-05-16T09:30:00Z'),
      };
      const created = { id: 'appt-1', clinicId: 'clinic-1', patientId: 'patient-1', ...command };

      (schedulingRules.validateAppointmentOverlap as jest.MockedFunction<typeof schedulingRules.validateAppointmentOverlap>)
        .mockResolvedValueOnce({ hasConflict: false } as never);
      (createUseCase.execute as jest.MockedFunction<typeof createUseCase.execute>)
        .mockResolvedValueOnce(created as never);

      const result = await service.createAppointment(command as never);

      expect(result).toEqual(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith('appointment.created', expect.anything());
    });

    it('should throw BadRequestException when scheduling conflict exists', async () => {
      const command = {
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        startTime: new Date('2026-05-16T09:00:00Z'),
        endTime: new Date('2026-05-16T09:30:00Z'),
      };

      (schedulingRules.validateAppointmentOverlap as jest.MockedFunction<typeof schedulingRules.validateAppointmentOverlap>)
        .mockResolvedValueOnce({
          hasConflict: true,
          conflict: { id: 'appt-existing', startTime: new Date(), endTime: new Date() },
        } as never);

      await expect(service.createAppointment(command as never)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment successfully', async () => {
      const appointment = {
        id: 'appt-1',
        clinicId: 'clinic-1',
        cancel: jest.fn(),
      };
      (queryService.getAppointment as jest.MockedFunction<typeof queryService.getAppointment>)
        .mockResolvedValueOnce(appointment as never);

      const repo = (service as unknown as { appointmentRepository: { update: jest.Mock } }).appointmentRepository;
      repo.update = jest.fn().mockResolvedValueOnce(appointment);

      const result = await service.cancelAppointment('appt-1', 'reason', 'clinic-1');

      expect(appointment.cancel).toHaveBeenCalledWith('reason');
      expect(result).toEqual(appointment);
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      (queryService.getAppointment as jest.MockedFunction<typeof queryService.getAppointment>)
        .mockRejectedValueOnce(new NotFoundException());

      await expect(service.cancelAppointment('missing', 'reason', 'clinic-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should throw BadRequestException on scheduling conflict during reschedule', async () => {
      const appointment = { id: 'appt-1', doctorId: 'doc-1', reschedule: jest.fn() };
      (queryService.getAppointment as jest.MockedFunction<typeof queryService.getAppointment>)
        .mockResolvedValueOnce(appointment as never);
      (schedulingRules.validateAppointmentOverlap as jest.MockedFunction<typeof schedulingRules.validateAppointmentOverlap>)
        .mockResolvedValueOnce({ hasConflict: true, conflict: { id: 'other' } } as never);

      await expect(
        service.rescheduleAppointment('appt-1', new Date(), new Date(), 'clinic-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
