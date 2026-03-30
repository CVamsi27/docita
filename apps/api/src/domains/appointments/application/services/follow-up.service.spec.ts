import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { FOLLOW_UP_REPOSITORY_TOKEN } from '@/domains/appointments/core/repositories/follow-up.repository.interface';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('FollowUpService', () => {
  let service: FollowUpService;
  let followUpRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockFollowUp = {
    id: 'followup-1',
    appointmentId: 'appt-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    clinicId: 'clinic-1',
    scheduledDate: new Date('2026-04-15'),
    reason: 'Post-op checkup',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    },
    doctor: { id: 'doctor-1', name: 'Dr. Smith' },
  };

  beforeEach(async () => {
    followUpRepository = {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUpcoming: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findForAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findByIdAndClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpService,
        { provide: FOLLOW_UP_REPOSITORY_TOKEN, useValue: followUpRepository },
      ],
    }).compile();

    service = module.get<FollowUpService>(FollowUpService);
  });

  describe('create', () => {
    it('creates a follow-up record', async () => {
      followUpRepository.create.mockResolvedValue(mockFollowUp);

      const result = await service.create({
        appointmentId: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        clinicId: 'clinic-1',
        scheduledDate: '2026-04-15',
        reason: 'Post-op checkup',
      });

      expect(followUpRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('followup-1');
    });
  });

  describe('findUpcoming', () => {
    it('returns upcoming follow-ups within 30 days', async () => {
      followUpRepository.findUpcoming.mockResolvedValue([mockFollowUp]);

      const result = await service.findUpcoming('clinic-1');

      expect(followUpRepository.findUpcoming).toHaveBeenCalledWith(
        'clinic-1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findForAppointment', () => {
    it('returns follow-ups for a specific appointment', async () => {
      followUpRepository.findForAppointment.mockResolvedValue([mockFollowUp]);

      const result = await service.findForAppointment('appt-1', 'clinic-1');

      expect(followUpRepository.findForAppointment).toHaveBeenCalledWith(
        'appt-1',
        'clinic-1',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('complete', () => {
    it('throws NotFoundException when follow-up not found', async () => {
      followUpRepository.findByIdAndClinic.mockResolvedValue(null);

      await expect(service.complete('nonexistent', 'clinic-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marks a follow-up as completed', async () => {
      followUpRepository.findByIdAndClinic.mockResolvedValue(mockFollowUp);
      followUpRepository.update.mockResolvedValue({
        ...mockFollowUp,
        status: 'COMPLETED',
      });

      const result = await service.complete('followup-1', 'clinic-1');
      expect(result.status).toBe('COMPLETED');
    });
  });
});
