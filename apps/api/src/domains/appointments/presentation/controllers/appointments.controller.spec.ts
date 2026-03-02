import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppointmentsController } from './appointments.controller';
import { AppointmentService as AppointmentsService } from '../../application/services/appointment.service';
import { JwtAuthGuard } from '../../../../shared/modules/auth/auth/jwt-auth.guard';
import { TierGuard } from '../../../../shared/modules/auth/auth/tier.guard';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;

  const mockAppointmentsService = {
    listAppointments: jest.fn<(query?: unknown) => Promise<unknown>>(),
    getAppointment: jest.fn<(id: string) => Promise<unknown>>(),
    createAppointment: jest.fn<(dto: unknown) => Promise<unknown>>(),
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
  };

  const mockAuthRequest = {
    user: {
      clinicId: 'clinic-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        {
          provide: AppointmentsService,
          useValue: mockAppointmentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TierGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppointmentsController>(AppointmentsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return appointments for the clinic', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue([
        mockAppointment,
      ]);

      const result = await controller.findAll(
        mockAuthRequest as never,
        {} as never,
      );

      expect(result).toEqual([mockAppointment]);
      expect(mockAppointmentsService.listAppointments).toHaveBeenCalled();
    });

    it('should pass query parameters', async () => {
      mockAppointmentsService.listAppointments.mockResolvedValue([
        mockAppointment,
      ]);

      await controller.findAll(
        mockAuthRequest as never,
        {
          date: '2025-11-28',
        } as never,
      );

      expect(mockAppointmentsService.listAppointments).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single appointment', async () => {
      mockAppointmentsService.getAppointment.mockResolvedValue(mockAppointment);

      const result = await controller.findOne('apt-123');

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.getAppointment).toHaveBeenCalledWith(
        'apt-123',
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

      const result = await controller.create(
        mockAuthRequest as never,
        createDto as never,
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

      const result = await controller.update(
        'apt-123',
        mockAuthRequest as never,
        updateDto as never,
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

      const result = await controller.createVitals(
        'apt-123',
        mockAuthRequest as never,
        vitalsDto as never,
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

      const result = await controller.updateVitals(
        'apt-123',
        mockAuthRequest as never,
        vitalsDto as never,
      );

      expect(result).toEqual(mockVitals);
      expect(mockAppointmentsService.updateVitals).toHaveBeenCalled();
    });
  });
});
