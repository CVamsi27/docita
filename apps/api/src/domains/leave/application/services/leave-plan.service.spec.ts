import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeavePlanService } from './leave-plan.service';
import { LEAVE_REPOSITORY_TOKEN } from '@/domains/leave/core/repositories/leave.repository.interface';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('LeavePlanService', () => {
  let service: LeavePlanService;
  let leaveRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockPlan = {
    id: 'plan-1',
    clinicId: 'clinic-1',
    leaveType: 'CASUAL',
    annualQuota: 12,
    carryForward: false,
    maxCarryForward: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    leaveRepository = {
      findLeavePlans: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findLeavePlanById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      upsertLeavePlan: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateLeavePlan: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavePlanService,
        { provide: LEAVE_REPOSITORY_TOKEN, useValue: leaveRepository },
      ],
    }).compile();

    service = module.get<LeavePlanService>(LeavePlanService);
  });

  describe('getPlans', () => {
    it('returns all plans for a clinic', async () => {
      leaveRepository.findLeavePlans.mockResolvedValue([mockPlan]);

      const result = await service.getPlans('clinic-1');

      expect(leaveRepository.findLeavePlans).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plan-1');
    });
  });

  describe('createPlan', () => {
    it('upserts a leave plan', async () => {
      leaveRepository.upsertLeavePlan.mockResolvedValue(mockPlan);

      const result = await service.createPlan('clinic-1', {
        leaveType: 'CASUAL',
        annualQuota: 12,
      });

      expect(leaveRepository.upsertLeavePlan).toHaveBeenCalled();
      expect(result.annualQuota).toBe(12);
    });
  });

  describe('updatePlan', () => {
    it('updates an existing plan', async () => {
      leaveRepository.findLeavePlanById.mockResolvedValue(mockPlan);
      leaveRepository.updateLeavePlan.mockResolvedValue({
        ...mockPlan,
        annualQuota: 15,
      });

      const result = await service.updatePlan('plan-1', 'clinic-1', {
        annualQuota: 15,
      });

      expect(result.annualQuota).toBe(15);
    });

    it('throws NotFoundException when plan not found', async () => {
      leaveRepository.findLeavePlanById.mockResolvedValue(null);

      await expect(
        service.updatePlan('nonexistent', 'clinic-1', { annualQuota: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when plan belongs to different clinic', async () => {
      leaveRepository.findLeavePlanById.mockResolvedValue({
        ...mockPlan,
        clinicId: 'other-clinic',
      });

      await expect(
        service.updatePlan('plan-1', 'clinic-1', { annualQuota: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
