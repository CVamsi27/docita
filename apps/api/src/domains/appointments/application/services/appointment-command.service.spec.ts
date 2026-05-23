import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { AppointmentCommandService } from './appointment-command.service';
import { AppointmentQueryService } from './appointment-query.service';
import { CreateAppointmentUseCase } from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { AppointmentMetricsService } from './appointment-metrics.service';
import { AppointmentDiagnosisService } from './appointment-diagnosis.service';
import { CancelAppointmentUseCase } from '@/domains/appointments/application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '@/domains/appointments/application/use-cases/reschedule-appointment.use-case';
import { StartConsultationUseCase } from '@/domains/appointments/application/use-cases/start-consultation.use-case';
import { UpdateAppointmentDetailsUseCase } from '@/domains/appointments/application/use-cases/update-appointment-details.use-case';
import { Role } from '@workspace/db';

const accessContext = { userId: 'user-1', role: Role.ADMIN };

describe('AppointmentCommandService', () => {
  let service: AppointmentCommandService;
  let queryService: jest.Mocked<AppointmentQueryService>;
  let createUseCase: jest.Mocked<CreateAppointmentUseCase>;
  let prisma: jest.Mocked<AppointmentPersistencePort>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let metricsService: jest.Mocked<AppointmentMetricsService>;
  let diagnosisService: jest.Mocked<AppointmentDiagnosisService>;
  let writeRepository: { update: jest.Mock };
  let cancelUseCase: jest.Mocked<CancelAppointmentUseCase>;
  let rescheduleUseCase: jest.Mocked<RescheduleAppointmentUseCase>;
  let startConsultationUseCase: jest.Mocked<StartConsultationUseCase>;
  let updateAppointmentDetailsUseCase: jest.Mocked<UpdateAppointmentDetailsUseCase>;

  beforeEach(() => {
    queryService = Object.create(
      AppointmentQueryService.prototype,
    ) as jest.Mocked<AppointmentQueryService>;
    queryService.getAppointment = jest.fn();

    createUseCase = Object.create(
      CreateAppointmentUseCase.prototype,
    ) as jest.Mocked<CreateAppointmentUseCase>;
    createUseCase.execute = jest.fn();

    prisma = {
      clinic: { findUnique: jest.fn() },
      appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<AppointmentPersistencePort>;

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    metricsService = Object.create(
      AppointmentMetricsService.prototype,
    ) as jest.Mocked<AppointmentMetricsService>;
    metricsService.recordObservationMetrics = jest.fn();

    diagnosisService = Object.create(
      AppointmentDiagnosisService.prototype,
    ) as jest.Mocked<AppointmentDiagnosisService>;
    diagnosisService.syncDiagnoses = jest.fn();

    writeRepository = { update: jest.fn() };

    cancelUseCase = Object.create(
      CancelAppointmentUseCase.prototype,
    ) as jest.Mocked<CancelAppointmentUseCase>;
    cancelUseCase.execute = jest.fn();

    rescheduleUseCase = Object.create(
      RescheduleAppointmentUseCase.prototype,
    ) as jest.Mocked<RescheduleAppointmentUseCase>;
    rescheduleUseCase.execute = jest.fn();

    startConsultationUseCase = Object.create(
      StartConsultationUseCase.prototype,
    ) as jest.Mocked<StartConsultationUseCase>;
    startConsultationUseCase.execute = jest.fn();

    updateAppointmentDetailsUseCase = Object.create(
      UpdateAppointmentDetailsUseCase.prototype,
    ) as jest.Mocked<UpdateAppointmentDetailsUseCase>;
    updateAppointmentDetailsUseCase.execute = jest.fn();

    service = new AppointmentCommandService(
      queryService,
      {} as never,
      writeRepository as never,
      createUseCase,
      cancelUseCase,
      rescheduleUseCase,
      startConsultationUseCase,
      updateAppointmentDetailsUseCase,
      eventEmitter,
      metricsService,
      diagnosisService,
    );
  });

  describe('createAppointment', () => {
    it('should create an appointment and emit appointment.created', async () => {
      const command = {
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        startTime: new Date('2026-05-16T09:00:00Z'),
        endTime: new Date('2026-05-16T09:30:00Z'),
      };
      const created = { id: 'appt-1', ...command };

      (
        createUseCase.execute as jest.MockedFunction<
          typeof createUseCase.execute
        >
      ).mockResolvedValueOnce(created as never);

      const result = await service.createAppointment(command as never);

      expect(result).toEqual(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ApplicationEvents.APPOINTMENT_CREATED,
        expect.anything(),
      );
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment successfully', async () => {
      const appointment = {
        id: 'appt-1',
        clinicId: 'clinic-1',
        cancel: jest.fn(),
      };
      (
        queryService.getAppointment as jest.MockedFunction<
          typeof queryService.getAppointment
        >
      ).mockResolvedValueOnce(appointment as never);

      cancelUseCase.execute.mockResolvedValueOnce(appointment as never);

      const result = await service.cancelAppointment(
        'appt-1',
        'reason',
        'clinic-1',
        accessContext,
      );

      expect(cancelUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment,
          reason: 'reason',
        }),
      );
      expect(result).toEqual(appointment);
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      (
        queryService.getAppointment as jest.MockedFunction<
          typeof queryService.getAppointment
        >
      ).mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.cancelAppointment(
          'missing',
          'reason',
          'clinic-1',
          accessContext,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should throw BadRequestException on scheduling conflict during reschedule', async () => {
      const appointment = {
        id: 'appt-1',
        doctorId: 'doc-1',
        reschedule: jest.fn(),
      };
      (
        queryService.getAppointment as jest.MockedFunction<
          typeof queryService.getAppointment
        >
      ).mockResolvedValueOnce(appointment as never);
      rescheduleUseCase.execute.mockRejectedValueOnce(
        new BadRequestException('Doctor has conflicting appointment'),
      );

      await expect(
        service.rescheduleAppointment(
          'appt-1',
          new Date(),
          new Date(),
          'clinic-1',
          accessContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
