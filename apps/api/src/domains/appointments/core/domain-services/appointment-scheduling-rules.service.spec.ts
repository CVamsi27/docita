import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppointmentSchedulingRulesService } from './appointment-scheduling-rules.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

describe('AppointmentSchedulingRulesService', () => {
  let service: AppointmentSchedulingRulesService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
      count: jest.fn<() => Promise<number>>(),
    },
    doctorTimeOff: {
      findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentSchedulingRulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AppointmentSchedulingRulesService>(
      AppointmentSchedulingRulesService,
    );
  });

  describe('validateAppointmentTime', () => {
    it('should accept valid appointment time', () => {
      const startTime = new Date(Date.now() + 86400000);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 1800000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when end time is before start time', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() - 1000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('end time must be after start time');
    });

    it('should reject appointment duration less than 15 minutes', () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 600000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 15 minutes');
    });

    it('should reject appointment duration more than 8 hours', () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 36000000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should reject appointment in the past', () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date(startTime.getTime() + 1800000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be in the past');
    });

    it('should warn about appointment outside business hours', () => {
      const startTime = new Date(Date.now() + 86400000);
      startTime.setHours(7, 0, 0);
      const endTime = new Date(startTime.getTime() + 1800000);

      const result = service.validateAppointmentTime(startTime, endTime);

      expect(result.valid).toBe(true);
      expect(result.error).toContain('outside standard business hours');
    });
  });

  describe('validateAppointmentOverlap', () => {
    it('should return no conflict when doctor is free', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValueOnce([]);

      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 1800000);

      const result = await service.validateAppointmentOverlap(
        'doctor-1',
        'clinic-1',
        startTime,
        endTime,
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflict).toBeUndefined();
    });

    it('should return conflict when appointment overlaps', async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 1800000);

      const conflictingAppt = {
        id: 'appt-1',
        startTime,
        endTime,
        patient: { name: 'John Doe' },
      };

      mockPrismaService.appointment.findMany.mockResolvedValueOnce([
        conflictingAppt,
      ]);

      const result = await service.validateAppointmentOverlap(
        'doctor-1',
        'clinic-1',
        startTime,
        endTime,
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.id).toBe('appt-1');
    });

    it('should exclude appointment when checking overlap', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValueOnce([]);

      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 1800000);

      await service.validateAppointmentOverlap(
        'doctor-1',
        'clinic-1',
        startTime,
        endTime,
        'existing-appt-id',
      );

      const latestCallArgs =
        mockPrismaService.appointment.findMany.mock.calls.at(-1)?.[0];
      expect(latestCallArgs).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: expect.objectContaining({ id: 'existing-appt-id' }),
          }),
        }),
      );
    });
  });

  describe('validateDoctorTimeOff', () => {
    it('should allow appointment when doctor is not on time off', async () => {
      mockPrismaService.doctorTimeOff.findFirst.mockResolvedValueOnce(null);

      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 1800000);

      const result = await service.validateDoctorTimeOff(
        'doctor-1',
        startTime,
        endTime,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent appointment when doctor is on time off', async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 1800000);

      mockPrismaService.doctorTimeOff.findFirst.mockResolvedValueOnce({
        reason: 'Vacation',
        startDate: new Date(startTime.getTime() - 3600000),
        endDate: new Date(endTime.getTime() + 3600000),
      });

      const result = await service.validateDoctorTimeOff(
        'doctor-1',
        startTime,
        endTime,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Vacation');

      expect(mockPrismaService.doctorTimeOff.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
            AND: [
              { startDate: { lt: endTime } },
              { endDate: { gt: startTime } },
            ],
          }),
        }),
      );
    });
  });

  describe('calculateAppointmentDuration', () => {
    it('should calculate duration correctly in minutes', () => {
      const startTime = new Date('2024-02-15T10:00:00');
      const endTime = new Date('2024-02-15T10:30:00');

      const duration = service.calculateAppointmentDuration(startTime, endTime);

      expect(duration).toBe(30);
    });

    it('should handle durations in hours', () => {
      const startTime = new Date('2024-02-15T10:00:00');
      const endTime = new Date('2024-02-15T12:00:00');

      const duration = service.calculateAppointmentDuration(startTime, endTime);

      expect(duration).toBe(120);
    });
  });

  describe('canStatusTransition', () => {
    it('should allow transition from SCHEDULED to CONFIRMED', () => {
      const result = service.canStatusTransition(
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow transition from CONFIRMED to IN_PROGRESS', () => {
      const result = service.canStatusTransition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
      );

      expect(result.allowed).toBe(true);
    });

    it('should prevent invalid transition', () => {
      const result = service.canStatusTransition(
        AppointmentStatus.COMPLETED,
        AppointmentStatus.SCHEDULED,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot transition');
    });

    it('should allow COMPLETED to stay COMPLETED', () => {
      const result = service.canStatusTransition(
        AppointmentStatus.COMPLETED,
        AppointmentStatus.COMPLETED,
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('validateSlotAvailability', () => {
    it('should report available slots when none booked', async () => {
      mockPrismaService.appointment.count.mockResolvedValueOnce(0);

      const date = new Date(Date.now() + 86400000);

      const result = await service.validateSlotAvailability(
        'doctor-1',
        'clinic-1',
        date,
        'morning',
      );

      expect(result.available).toBe(true);
      expect(result.slots).toBe(4);
    });

    it('should report unavailable when slot is full', async () => {
      mockPrismaService.appointment.count.mockResolvedValueOnce(4);

      const date = new Date(Date.now() + 86400000);

      const result = await service.validateSlotAvailability(
        'doctor-1',
        'clinic-1',
        date,
        'afternoon',
      );

      expect(result.available).toBe(false);
      expect(result.slots).toBe(0);
    });
  });

  describe('validateConsultationPrerequisites', () => {
    it('should validate all prerequisites are met', async () => {
      const appointmentId = 'appt-1';

      mockPrismaService.appointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
        patient: {
          dateOfBirth: new Date('1985-01-01'),
          phoneNumber: '9876543410',
          email: null,
        },
        vitalSign: {
          temperature: 98.6,
        },
      });

      const result =
        await service.validateConsultationPrerequisites(appointmentId);

      expect(result.valid).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it('should identify missing prerequisites', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: AppointmentStatus.SCHEDULED,
        patient: {
          dateOfBirth: null,
          phoneNumber: null,
          email: null,
        },
        vitalSign: null,
      });

      const result = await service.validateConsultationPrerequisites('appt-1');

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('Patient date of birth');
      expect(result.missing).toContain(
        'Patient contact information (phone or email)',
      );
      expect(result.missing).toContain('Patient vital signs');
    });
  });
});
