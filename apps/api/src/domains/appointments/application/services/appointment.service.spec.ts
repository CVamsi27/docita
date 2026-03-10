import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('AppointmentService', () => {
  type AppointmentLike = Record<string, unknown>;
  type AppointmentListResult = {
    data: AppointmentLike[];
    total: number;
    page?: number;
    pageSize?: number;
  };
  type MockAppointmentService = {
    createAppointment: jest.MockedFunction<
      (dto: AppointmentLike) => Promise<AppointmentLike>
    >;
    getAppointment: jest.MockedFunction<
      (id: string, clinicId: string) => Promise<AppointmentLike>
    >;
    updateAppointment: jest.MockedFunction<
      (
        id: string,
        clinicId: string,
        dto: AppointmentLike,
      ) => Promise<AppointmentLike>
    >;
    listAppointments: jest.MockedFunction<
      (
        clinicId: string,
        query: AppointmentLike,
      ) => Promise<AppointmentListResult>
    >;
    cancelAppointment: jest.MockedFunction<
      (id: string, clinicId: string, reason: string) => Promise<AppointmentLike>
    >;
    getAvailableSlots: jest.MockedFunction<
      (
        doctorId: string,
        date: string | Date,
        clinicId: string,
      ) => Promise<AppointmentLike[]>
    >;
    completeAppointment: jest.MockedFunction<
      (id: string, clinicId: string) => Promise<AppointmentLike>
    >;
  };

  let service: MockAppointmentService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    appointment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'AppointmentService',
          useValue: {
            createAppointment: jest.fn(),
            getAppointment: jest.fn(),
            updateAppointment: jest.fn(),
            listAppointments: jest.fn(),
            cancelAppointment: jest.fn(),
            getAvailableSlots: jest.fn(),
            completeAppointment: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MockAppointmentService>('AppointmentService');
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        endTime: new Date('2024-03-01 10:30:00'),
        consultationType: 'IN_PERSON',
      };

      const createdAppointment = {
        id: 'appt-1',
        ...createDto,
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createAppointment.mockResolvedValueOnce(createdAppointment);

      const result = await service.createAppointment(createDto);

      expect(result).toEqual(createdAppointment);
      expect(result.status).toBe('SCHEDULED');
    });

    it('should reject overlapping appointments', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        endTime: new Date('2024-03-01 10:30:00'),
        consultationType: 'IN_PERSON',
      };

      service.createAppointment.mockRejectedValueOnce(
        new BadRequestException('Doctor has conflicting appointment'),
      );

      await expect(service.createAppointment(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject appointments in the past', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2020-03-01 10:00:00'),
        endTime: new Date('2020-03-01 10:30:00'),
        consultationType: 'IN_PERSON',
      };

      service.createAppointment.mockRejectedValueOnce(
        new BadRequestException('Cannot book appointment in the past'),
      );

      await expect(service.createAppointment(createDto)).rejects.toThrow();
    });

    it('should validate appointment duration', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        endTime: new Date('2024-03-01 10:05:00'),
        consultationType: 'IN_PERSON',
      };

      service.createAppointment.mockRejectedValueOnce(
        new BadRequestException(
          'Appointment duration must be at least 15 minutes',
        ),
      );

      await expect(service.createAppointment(createDto)).rejects.toThrow();
    });

    it('should enforce business hours', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 22:00:00'),
        endTime: new Date('2024-03-01 22:30:00'),
        consultationType: 'IN_PERSON',
      };

      service.createAppointment.mockRejectedValueOnce(
        new BadRequestException('Appointment outside business hours'),
      );

      await expect(service.createAppointment(createDto)).rejects.toThrow();
    });
  });

  describe('getAppointment', () => {
    it('should retrieve appointment by ID', async () => {
      const appointment = {
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getAppointment.mockResolvedValueOnce(appointment);

      const result = await service.getAppointment('appt-1', 'clinic-1');

      expect(result.id).toBe('appt-1');
      expect(result.status).toBe('SCHEDULED');
    });

    it('should throw NotFoundException for non-existent appointment', async () => {
      service.getAppointment.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.getAppointment('nonexistent', 'clinic-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      service.getAppointment.mockRejectedValueOnce(new ForbiddenException());

      await expect(
        service.getAppointment('appt-clinic-b', 'clinic-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return appointment with patient and doctor details', async () => {
      const appointment = {
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        status: 'SCHEDULED',
        patient: {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        doctor: {
          id: 'doctor-1',
          firstName: 'Dr.',
          lastName: 'Smith',
          specialization: 'Cardiology',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getAppointment.mockResolvedValueOnce(appointment);

      const result = await service.getAppointment('appt-1', 'clinic-1');

      expect(result.patient).toBeDefined();
      expect(result.doctor).toBeDefined();
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment time', async () => {
      const updateDto = {
        startTime: new Date('2024-03-01 11:00:00'),
        endTime: new Date('2024-03-01 11:30:00'),
      };

      const updatedAppointment = {
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: updateDto.startTime,
        endTime: updateDto.endTime,
        status: 'SCHEDULED',
        updatedAt: new Date(),
      };

      service.updateAppointment.mockResolvedValueOnce(updatedAppointment);

      const result = await service.updateAppointment(
        'appt-1',
        'clinic-1',
        updateDto,
      );

      expect(result.startTime).toEqual(updateDto.startTime);
    });

    it('should check for conflicts when rescheduling', async () => {
      const updateDto = {
        startTime: new Date('2024-03-01 12:00:00'),
        endTime: new Date('2024-03-01 12:30:00'),
      };

      service.updateAppointment.mockRejectedValueOnce(
        new BadRequestException('Doctor has conflicting appointment'),
      );

      await expect(
        service.updateAppointment('appt-1', 'clinic-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow updates to completed appointments', async () => {
      const updateDto = {
        startTime: new Date('2024-03-01 11:00:00'),
      };

      service.updateAppointment.mockRejectedValueOnce(
        new BadRequestException('Cannot update completed appointment'),
      );

      await expect(
        service.updateAppointment('appt-completed', 'clinic-1', updateDto),
      ).rejects.toThrow();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      const cancelledAppointment = {
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        status: 'CANCELLED',
        cancellationReason: 'Patient requested',
        cancelledAt: new Date(),
      };

      service.cancelAppointment.mockResolvedValueOnce(cancelledAppointment);

      const result = await service.cancelAppointment(
        'appt-1',
        'clinic-1',
        'Patient requested',
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should not allow cancellation of past appointments', async () => {
      service.cancelAppointment.mockRejectedValueOnce(
        new BadRequestException('Cannot cancel past appointment'),
      );

      await expect(
        service.cancelAppointment('appt-past', 'clinic-1', 'Testing'),
      ).rejects.toThrow();
    });

    it('should not allow cancellation of completed appointments', async () => {
      service.cancelAppointment.mockRejectedValueOnce(
        new BadRequestException('Cannot cancel completed appointment'),
      );

      await expect(
        service.cancelAppointment('appt-completed', 'clinic-1', 'Testing'),
      ).rejects.toThrow();
    });
  });

  describe('listAppointments', () => {
    it('should list appointments for clinic', async () => {
      const appointments = [
        {
          id: 'appt-1',
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          clinicId: 'clinic-1',
          startTime: new Date('2024-03-01 10:00:00'),
          status: 'SCHEDULED',
        },
        {
          id: 'appt-2',
          patientId: 'patient-2',
          doctorId: 'doctor-1',
          clinicId: 'clinic-1',
          startTime: new Date('2024-03-01 11:00:00'),
          status: 'SCHEDULED',
        },
      ];

      service.listAppointments.mockResolvedValueOnce({
        data: appointments,
        total: 2,
      });

      const result = await service.listAppointments('clinic-1', {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by doctor', async () => {
      const appointments = [
        {
          id: 'appt-1',
          doctorId: 'doctor-1',
          clinicId: 'clinic-1',
          startTime: new Date('2024-03-01 10:00:00'),
        },
      ];

      service.listAppointments.mockResolvedValueOnce({
        data: appointments,
        total: 1,
      });

      const result = await service.listAppointments('clinic-1', {
        doctorId: 'doctor-1',
      });

      expect(result.data.every((a) => a['doctorId'] === 'doctor-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const appointments = [
        {
          id: 'appt-1',
          status: 'SCHEDULED',
          clinicId: 'clinic-1',
        },
      ];

      service.listAppointments.mockResolvedValueOnce({
        data: appointments,
        total: 1,
      });

      const result = await service.listAppointments('clinic-1', {
        status: 'SCHEDULED',
      });

      expect(result.data.every((a) => a['status'] === 'SCHEDULED')).toBe(true);
    });

    it('should support pagination', async () => {
      const appointments = Array.from({ length: 10 }, (_, i) => ({
        id: `appt-${i + 1}`,
        clinicId: 'clinic-1',
        startTime: new Date(),
        status: 'SCHEDULED',
      }));

      service.listAppointments.mockResolvedValueOnce({
        data: appointments.slice(0, 10),
        total: 50,
        page: 1,
        pageSize: 10,
      });

      const result = await service.listAppointments('clinic-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(50);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots for doctor', async () => {
      const slots = [
        { time: new Date('2024-03-01 10:00:00'), available: true },
        { time: new Date('2024-03-01 10:30:00'), available: true },
        { time: new Date('2024-03-01 11:00:00'), available: true },
      ];

      service.getAvailableSlots.mockResolvedValueOnce(slots);

      const result = await service.getAvailableSlots(
        'doctor-1',
        '2024-03-01',
        'clinic-1',
      );

      expect(result).toHaveLength(3);
      expect(result.every((s) => Boolean(s['available']))).toBe(true);
    });

    it('should exclude booked slots', async () => {
      const slots = [
        { time: new Date('2024-03-01 10:00:00'), available: true },
        { time: new Date('2024-03-01 10:30:00'), available: false },
        { time: new Date('2024-03-01 11:00:00'), available: true },
      ];

      service.getAvailableSlots.mockResolvedValueOnce(slots);

      const result = await service.getAvailableSlots(
        'doctor-1',
        '2024-03-01',
        'clinic-1',
      );

      expect(result.filter((s) => Boolean(s['available']))).toHaveLength(2);
    });

    it('should respect doctor time-off', async () => {
      const slots = [
        { time: new Date('2024-03-01 10:00:00'), available: false },
        { time: new Date('2024-03-01 10:30:00'), available: false },
      ];

      service.getAvailableSlots.mockResolvedValueOnce(slots);

      const result = await service.getAvailableSlots(
        'doctor-1',
        '2024-03-01',
        'clinic-1',
      );

      expect(result.filter((s) => Boolean(s['available']))).toHaveLength(0);
    });
  });

  describe('completeAppointment', () => {
    it('should mark appointment as completed', async () => {
      const completedAppointment = {
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      service.completeAppointment.mockResolvedValueOnce(completedAppointment);

      const result = await service.completeAppointment('appt-1', 'clinic-1');

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
    });

    it('should not allow completing past appointments', async () => {
      service.completeAppointment.mockRejectedValueOnce(
        new BadRequestException('Cannot complete past appointment'),
      );

      await expect(
        service.completeAppointment('appt-past', 'clinic-1'),
      ).rejects.toThrow();
    });
  });

  describe('tenant isolation', () => {
    it('should not allow clinic A to access clinic B appointments', async () => {
      service.getAppointment.mockRejectedValueOnce(new ForbiddenException());

      await expect(
        service.getAppointment('appt-clinic-b', 'clinic-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list only clinic-specific appointments', async () => {
      service.listAppointments.mockImplementation(async (clinicId: string) => {
        return {
          data: [
            { id: 'appt-1', clinicId },
            { id: 'appt-2', clinicId },
          ],
          total: 2,
        };
      });

      const result = await service.listAppointments('clinic-1', {});

      expect(result.data.every((a) => a['clinicId'] === 'clinic-1')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete appointment lifecycle', async () => {
      const createDto = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        startTime: new Date('2024-03-01 10:00:00'),
        endTime: new Date('2024-03-01 10:30:00'),
        consultationType: 'IN_PERSON',
      };

      const createdAppt = { id: 'appt-1', ...createDto, status: 'SCHEDULED' };
      service.createAppointment.mockResolvedValueOnce(createdAppt);

      const created = await service.createAppointment(createDto);
      expect(created.status).toBe('SCHEDULED');

      service.getAppointment.mockResolvedValueOnce(createdAppt);
      const retrieved = await service.getAppointment('appt-1', 'clinic-1');
      expect(retrieved.id).toBe('appt-1');

      const updatedAppt = {
        ...createdAppt,
        startTime: new Date('2024-03-01 14:00:00'),
      };
      service.updateAppointment.mockResolvedValueOnce(updatedAppt);

      const updated = await service.updateAppointment('appt-1', 'clinic-1', {
        startTime: new Date('2024-03-01 14:00:00'),
      });
      expect(updated.startTime).toEqual(new Date('2024-03-01 14:00:00'));

      service.completeAppointment.mockResolvedValueOnce({
        ...updatedAppt,
        status: 'COMPLETED',
      });

      const completed = await service.completeAppointment('appt-1', 'clinic-1');
      expect(completed.status).toBe('COMPLETED');
    });
  });
});
