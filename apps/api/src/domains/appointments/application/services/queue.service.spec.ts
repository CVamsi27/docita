import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueCommandService } from './queue-command.service';
import { QueueQueryService } from './queue-query.service';
import { QUEUE_REPOSITORY_TOKEN } from '@/domains/appointments/core/repositories/queue.repository.interface';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('QueueService', () => {
  let service: QueueService;
  let queueRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockToken = {
    id: 'token-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    appointmentId: 'appt-1',
    doctorId: 'doctor-1',
    tokenNumber: 1,
    priority: false,
    status: 'WAITING',
    tokenType: 'scheduled',
    scheduledTime: new Date(),
    estimatedDuration: 15,
    estimatedWaitTime: null,
    calledAt: null,
    completedAt: null,
    consultationStart: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
      gender: null,
      dateOfBirth: null,
    },
    doctor: { id: 'doctor-1', name: 'Dr. Smith' },
    appointment: {
      id: 'appt-1',
      type: 'CONSULTATION',
      doctor: { id: 'doctor-1', name: 'Dr. Smith' },
    },
  };

  const mockAppointment = {
    id: 'appt-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startTime: new Date(),
    patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
  };

  beforeEach(async () => {
    queueRepository = {
      findTodayTokens: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findAppointmentForCheckIn:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findExistingToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLastTodayTokenNumber:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findTokenByIdAndClinic:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      cancelTodayActiveTokens:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueCommandService,
        QueueQueryService,
        QueueService,
        { provide: QUEUE_REPOSITORY_TOKEN, useValue: queueRepository },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-04-01T12:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe('getQueue', () => {
    it('returns current queue for a clinic', async () => {
      queueRepository.findTodayTokens.mockResolvedValue([mockToken]);

      const result = await service.getQueue('clinic-1');

      expect(queueRepository.findTodayTokens).toHaveBeenCalledWith(
        'clinic-1',
        expect.any(Date),
        expect.any(Date),
        undefined,
        ['WAITING', 'IN_PROGRESS'],
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it('filters results by search term', async () => {
      queueRepository.findTodayTokens.mockImplementation(
        async (
          _clinicId: unknown,
          _from: unknown,
          _to: unknown,
          _doctorId: unknown,
          _statusIn: unknown,
          search: unknown,
        ) => {
          if (search === 'John') return [mockToken];
          return [];
        },
      );

      const result = await service.getQueue('clinic-1', undefined, 'John');
      expect(result).toHaveLength(1);

      const noResult = await service.getQueue(
        'clinic-1',
        undefined,
        'zzz-nomatch',
      );
      expect(noResult).toHaveLength(0);
    });
  });

  describe('checkIn', () => {
    it('creates a queue token for a new check-in', async () => {
      queueRepository.findAppointmentForCheckIn.mockResolvedValue(
        mockAppointment,
      );
      queueRepository.findExistingToken.mockResolvedValue(null);
      queueRepository.findLastTodayTokenNumber.mockResolvedValue(0);
      queueRepository.createToken.mockResolvedValue(mockToken);

      const result = await service.checkIn('clinic-1', 'appt-1');

      expect(result.success).toBe(true);
      expect(queueRepository.createToken).toHaveBeenCalled();
    });

    it('returns existing token if already checked in', async () => {
      queueRepository.findAppointmentForCheckIn.mockResolvedValue(
        mockAppointment,
      );
      queueRepository.findExistingToken.mockResolvedValue(mockToken);

      const result = await service.checkIn('clinic-1', 'appt-1');

      expect(result.success).toBe(true);
      expect(queueRepository.createToken).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when appointment not found', async () => {
      queueRepository.findAppointmentForCheckIn.mockResolvedValue(null);

      await expect(service.checkIn('clinic-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('callPatient', () => {
    it('marks a patient as IN_PROGRESS', async () => {
      queueRepository.findTokenByIdAndClinic.mockResolvedValue(mockToken);
      queueRepository.updateToken.mockResolvedValue({
        ...mockToken,
        status: 'IN_PROGRESS',
      });

      const result = await service.callPatient('clinic-1', 'token-1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws NotFoundException when token not found', async () => {
      queueRepository.findTokenByIdAndClinic.mockResolvedValue(null);
      await expect(
        service.callPatient('clinic-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completePatient', () => {
    it('marks a patient as COMPLETED', async () => {
      queueRepository.findTokenByIdAndClinic.mockResolvedValue(mockToken);
      queueRepository.updateToken.mockResolvedValue({
        ...mockToken,
        status: 'COMPLETED',
      });

      const result = await service.completePatient('clinic-1', 'token-1');
      expect(result.status).toBe('COMPLETED');
    });

    it('throws NotFoundException when token not found', async () => {
      queueRepository.findTokenByIdAndClinic.mockResolvedValue(null);
      await expect(
        service.completePatient('clinic-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetQueue', () => {
    it('cancels all active tokens for today', async () => {
      queueRepository.cancelTodayActiveTokens.mockResolvedValue(undefined);

      const result = await service.resetQueue('clinic-1');
      expect(result.success).toBe(true);
      expect(queueRepository.cancelTodayActiveTokens).toHaveBeenCalledWith(
        'clinic-1',
        expect.any(Date),
      );
    });
  });
});
