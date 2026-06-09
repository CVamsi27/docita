import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppointmentsScheduleController } from './appointments-schedule.controller';
import { AppointmentsWorkflowController } from './appointments-workflow.controller';
import { AppointmentsConsultationController } from './appointments-consultation.controller';
import { AppointmentsClinicalController } from './appointments-clinical.controller';
import { AppointmentService as AppointmentsService } from '@/domains/appointments/application/services/appointment.service';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  IdempotencyInterceptor,
  IdempotencyService,
} from '@/shared/modules/idempotency';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { Role } from '@workspace/db';
import { CreateAppointmentDto } from '@/domains/appointments/application/dto/appointments.dto';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';

describe('Appointments controllers', () => {
  let scheduleController: AppointmentsScheduleController;
  let workflowController: AppointmentsWorkflowController;
  let consultationController: AppointmentsConsultationController;
  let clinicalController: AppointmentsClinicalController;

  type AuthRequest = RequestWithUser & {
    user: NonNullable<RequestWithUser['user']>;
  };

  const mockAppointmentsService = {
    getClinicTimezone: jest
      .fn<(...args: unknown[]) => Promise<string>>()
      .mockResolvedValue('Asia/Kolkata'),
    listAppointments: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    startConsultation: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    updateAppointmentDetails:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cancelAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    rescheduleAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createVitals: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    updateVitals: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAppointment = {
    id: 'apt-123',
    clinicId: 'clinic-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    startTime: new Date(),
    endTime: new Date(),
    status: 'scheduled',
    type: 'consultation',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockAppointmentList = {
    items: [mockAppointment],
    hasMore: false,
    count: 1,
  };

  const createRequest = (
    userOverrides: Partial<NonNullable<RequestWithUser['user']>> = {},
  ): AuthRequest =>
    ({
      user: {
        id: 'doctor-123',
        clinicId: 'clinic-123',
        role: Role.DOCTOR,
        ...userOverrides,
      },
    }) as AuthRequest;

  const mockAuthRequest = createRequest();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        AppointmentsScheduleController,
        AppointmentsWorkflowController,
        AppointmentsConsultationController,
        AppointmentsClinicalController,
      ],
      providers: [
        {
          provide: AppointmentsService,
          useValue: mockAppointmentsService,
        },
        {
          provide: IdempotencyService,
          useValue: {},
        },
        {
          provide: IdempotencyInterceptor,
          useValue: {
            intercept: jest.fn(
              (_ctx: unknown, next: { handle: () => unknown }) => next.handle(),
            ),
          },
        },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn(), logPatientAccess: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TierGuard)
      .useValue({ canActivate: () => true })
      .compile();

    scheduleController = module.get(AppointmentsScheduleController);
    workflowController = module.get(AppointmentsWorkflowController);
    consultationController = module.get(AppointmentsConsultationController);
    clinicalController = module.get(AppointmentsClinicalController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduleController).toBeDefined();
    expect(workflowController).toBeDefined();
    expect(consultationController).toBeDefined();
    expect(clinicalController).toBeDefined();
  });

  describe('findAll', () => {
    it('should return appointments for the clinic', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      const result = await scheduleController.findAll(mockAuthRequest, {});

      expect(result).toEqual(mockAppointmentList);
      expect(mockAppointmentsService.listAppointments).toHaveBeenCalled();
    });

    it('should pass query parameters', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      await scheduleController.findAll(mockAuthRequest, {
        date: '2025-11-28',
      });

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarPickerDate: '2025-11-28',
          clinicId: mockAuthRequest.user.clinicId,
        }),
      );
    });

    it('should force doctor access to their own appointments when a different doctorId is requested', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      await scheduleController.findAll(mockAuthRequest, {
        doctorId: 'doctor-999',
      });

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: mockAuthRequest.user.id,
        }),
      );
    });

    it('should scope doctor access to their own appointments when doctorId is not provided', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      await scheduleController.findAll(mockAuthRequest, {});

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: mockAuthRequest.user.clinicId,
          doctorId: mockAuthRequest.user.id,
        }),
      );
    });

    it('should allow admin-doctor to request appointments for any doctor', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      await scheduleController.findAll(
        createRequest({
          id: 'admin-doctor-123',
          role: Role.ADMIN_DOCTOR,
        }),
        { doctorId: 'doctor-999' },
      );

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: 'doctor-999',
        }),
      );
    });

    it('should allow receptionist to request appointments for any doctor', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue(
        mockAppointmentList,
      );

      await scheduleController.findAll(
        createRequest({
          id: 'receptionist-123',
          role: Role.RECEPTIONIST,
        }),
        { doctorId: 'doctor-999' },
      );

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: 'doctor-999',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single appointment', async () => {
      mockAppointmentsService.getAppointment.mockResolvedValue(mockAppointment);

      const result = await scheduleController.findOne(
        'apt-123',
        mockAuthRequest,
      );

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.getAppointment).toHaveBeenCalledWith(
        'apt-123',
        mockAuthRequest.user.clinicId,
        {
          role: mockAuthRequest.user.role,
          userId: mockAuthRequest.user.id,
        },
      );
    });
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const createDto = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        startTime: new Date(),
        endTime: new Date(),
        type: 'consultation' as const,
        status: 'scheduled' as const,
      };

      mockAppointmentsService.createAppointment.mockResolvedValue(
        mockAppointment,
      );

      const result = await scheduleController.create(
        mockAuthRequest,
        createDto as CreateAppointmentDto,
      );

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.createAppointment).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an appointment', async () => {
      const updateDto = { status: 'confirmed' as const };
      const updatedAppointment = { ...mockAppointment, ...updateDto };

      mockAppointmentsService.updateAppointmentDetails.mockResolvedValue(
        updatedAppointment,
      );

      const result = await scheduleController.update(
        'apt-123',
        mockAuthRequest,
        updateDto,
      );

      expect(result).toEqual(updatedAppointment);
      expect(
        mockAppointmentsService.updateAppointmentDetails,
      ).toHaveBeenCalled();
    });
  });

  describe('createVitals', () => {
    it('should create vitals', async () => {
      const vitalsDto = {
        height: 175,
        weight: 70,
      };
      const mockVitals = { id: 'vitals-123', ...vitalsDto };

      mockAppointmentsService.createVitals.mockResolvedValue(mockVitals);

      const result = await clinicalController.createVitals(
        'apt-123',
        mockAuthRequest,
        vitalsDto,
      );

      expect(result).toEqual(mockVitals);
      expect(mockAppointmentsService.createVitals).toHaveBeenCalled();
    });
  });

  describe('updateVitals', () => {
    it('should update vitals', async () => {
      const vitalsDto = {
        weight: 71,
      };
      const mockVitals = { id: 'vitals-123', height: 175, ...vitalsDto };

      mockAppointmentsService.updateVitals.mockResolvedValue(mockVitals);

      const result = await clinicalController.updateVitals(
        'apt-123',
        mockAuthRequest,
        vitalsDto,
      );

      expect(result).toEqual(mockVitals);
      expect(mockAppointmentsService.updateVitals).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel appointment with clinic-scoped access context', async () => {
      mockAppointmentsService.cancelAppointment.mockResolvedValue(undefined);

      await workflowController.cancel('apt-123', mockAuthRequest, {
        reason: 'Patient unavailable',
      });

      expect(mockAppointmentsService.cancelAppointment).toHaveBeenCalledWith(
        'apt-123',
        'Patient unavailable',
        mockAuthRequest.user.clinicId,
        {
          role: mockAuthRequest.user.role,
          userId: mockAuthRequest.user.id,
        },
      );
    });
  });

  describe('startConsultation', () => {
    it('should start consultation for the assigned clinician', async () => {
      mockAppointmentsService.startConsultation.mockResolvedValue({
        appointmentId: 'apt-123',
        status: 'in-progress',
      });

      const result = await consultationController.startConsultation(
        'apt-123',
        mockAuthRequest,
      );

      expect(result).toEqual({
        appointmentId: 'apt-123',
        status: 'in-progress',
      });
      expect(mockAppointmentsService.startConsultation).toHaveBeenCalledWith(
        'apt-123',
        mockAuthRequest.user.clinicId,
        {
          role: mockAuthRequest.user.role,
          userId: mockAuthRequest.user.id,
        },
      );
    });
  });
});
