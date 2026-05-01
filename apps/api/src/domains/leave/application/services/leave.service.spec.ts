import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LEAVE_REPOSITORY_TOKEN } from '@/domains/leave/core/repositories/leave.repository.interface';
import { AvailabilityScheduleService } from '@/domains/doctors/application/services/availability-schedule.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockLeave = {
    id: 'leave-1',
    staffId: 'staff-1',
    clinicId: 'clinic-1',
    leaveType: 'CASUAL',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-02'),
    reason: 'Personal',
    status: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    staff: { id: 'staff-1', name: 'Dr. John', email: 'john@test.com' },
    approver: null,
  };

  beforeEach(async () => {
    leaveRepository = {
      createLeave: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeaveById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeaveWithStaff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateLeave: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeaves: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findTimeOffsForLeave: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeavePlans: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createLeavePlan: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      upsertLeavePlan: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeavePlanById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateLeavePlan: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: LEAVE_REPOSITORY_TOKEN, useValue: leaveRepository },
        {
          provide: AvailabilityScheduleService,
          useValue: {
            createTimeOff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            deleteTimeOff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  describe('applyLeave', () => {
    it('creates a leave request', async () => {
      leaveRepository.createLeave.mockResolvedValue(mockLeave);

      const result = await service.applyLeave('staff-1', 'clinic-1', {
        leaveType: 'CASUAL',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        reason: 'Personal',
      });

      expect(leaveRepository.createLeave).toHaveBeenCalled();
      expect(result.id).toBe('leave-1');
    });

    it('throws BadRequestException when end date is before start date', async () => {
      await expect(
        service.applyLeave('staff-1', 'clinic-1', {
          leaveType: 'CASUAL',
          startDate: '2026-04-03',
          endDate: '2026-04-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a holiday leave request', async () => {
      const holidayLeave = { ...mockLeave, leaveType: 'HOLIDAY' };
      leaveRepository.createLeave.mockResolvedValue(holidayLeave);

      const result = await service.applyLeave('staff-1', 'clinic-1', {
        leaveType: 'HOLIDAY',
        startDate: '2026-12-22',
        endDate: '2026-12-26',
        reason: 'Clinic holiday week',
      });

      expect(leaveRepository.createLeave).toHaveBeenCalledWith(
        expect.objectContaining({
          leaveType: 'HOLIDAY',
        }),
      );
      expect(result.leaveType).toBe('HOLIDAY');
    });

    it('rejects unsupported leave type strings', async () => {
      await expect(
        service.applyLeave('staff-1', 'clinic-1', {
          leaveType: 'INVALID_TYPE',
          startDate: '2026-04-01',
          endDate: '2026-04-02',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveLeave', () => {
    it('approves a pending leave', async () => {
      const leaveWithStaff = {
        ...mockLeave,
        staff: { ...mockLeave.staff, role: 'RECEPTIONIST' },
      };
      leaveRepository.findLeaveWithStaff.mockResolvedValue(leaveWithStaff);
      leaveRepository.updateLeave.mockResolvedValue({
        ...mockLeave,
        status: 'APPROVED',
      });

      const result = await service.approveLeave(
        'leave-1',
        'admin-1',
        'clinic-1',
      );

      expect(leaveRepository.updateLeave).toHaveBeenCalledWith(
        'leave-1',
        expect.objectContaining({ status: 'APPROVED' }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('throws NotFoundException when leave not found', async () => {
      leaveRepository.findLeaveWithStaff.mockResolvedValue(null);

      await expect(
        service.approveLeave('nonexistent', 'admin-1', 'clinic-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when leave belongs to different clinic', async () => {
      leaveRepository.findLeaveWithStaff.mockResolvedValue({
        ...mockLeave,
        clinicId: 'other-clinic',
        staff: { ...mockLeave.staff, role: 'RECEPTIONIST' },
      });

      await expect(
        service.approveLeave('leave-1', 'admin-1', 'clinic-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when leave is not in PENDING status', async () => {
      leaveRepository.findLeaveWithStaff.mockResolvedValue({
        ...mockLeave,
        status: 'APPROVED',
        staff: { ...mockLeave.staff, role: 'RECEPTIONIST' },
      });

      await expect(
        service.approveLeave('leave-1', 'admin-1', 'clinic-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectLeave', () => {
    it('rejects a pending leave', async () => {
      leaveRepository.findLeaveById.mockResolvedValue(mockLeave);
      leaveRepository.updateLeave.mockResolvedValue({
        ...mockLeave,
        status: 'REJECTED',
        approver: null,
      });

      const result = await service.rejectLeave(
        'leave-1',
        'admin-1',
        'clinic-1',
        'No reason',
      );
      expect(result.status).toBe('REJECTED');
    });

    it('throws NotFoundException when leave not found', async () => {
      leaveRepository.findLeaveById.mockResolvedValue(null);
      await expect(
        service.rejectLeave('nonexistent', 'admin-1', 'clinic-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelLeave', () => {
    it('cancels a pending leave', async () => {
      leaveRepository.findLeaveById.mockResolvedValue(mockLeave);
      leaveRepository.updateLeave.mockResolvedValue({
        ...mockLeave,
        status: 'CANCELLED',
        approver: null,
      });

      const result = await service.cancelLeave(
        'leave-1',
        'staff-1',
        'clinic-1',
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('throws ForbiddenException when staff tries to cancel another staff leave', async () => {
      leaveRepository.findLeaveById.mockResolvedValue(mockLeave);
      await expect(
        service.cancelLeave('leave-1', 'other-staff', 'clinic-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when leave is already cancelled', async () => {
      leaveRepository.findLeaveById.mockResolvedValue({
        ...mockLeave,
        status: 'CANCELLED',
      });
      await expect(
        service.cancelLeave('leave-1', 'staff-1', 'clinic-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLeaveBalance', () => {
    it('returns leave balance by type', async () => {
      leaveRepository.findLeavePlans.mockResolvedValue([
        { leaveType: 'CASUAL', annualQuota: 10 },
      ]);
      leaveRepository.findLeaves.mockResolvedValue([]);

      const result = await service.getLeaveBalance('staff-1', 'clinic-1');

      expect(result).toHaveLength(6);
      const casual = result.find((r) => r.leaveType === 'CASUAL');
      expect(casual?.annualQuota).toBe(10);
      expect(casual?.used).toBe(0);

      const holiday = result.find((r) => r.leaveType === 'HOLIDAY');
      expect(holiday).toBeDefined();
      expect(holiday?.annualQuota).toBe(0);
      expect(holiday?.used).toBe(0);
    });
  });
});
