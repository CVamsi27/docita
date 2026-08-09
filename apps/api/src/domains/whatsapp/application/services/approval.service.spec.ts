import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { ApprovalStatus } from '@workspace/db';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('ApprovalService', () => {
  let service: ApprovalService;
  const FIXED_NOW = new Date('2026-08-09T10:00:00.000Z');
  let mockPersistence: ReturnType<typeof buildMockPersistence>;

  function buildMockPersistence() {
    return {
      prescription: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({ id: 'rx-1' })),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'rx-1',
            approvalStatus: ApprovalStatus.APPROVED,
          })),
      },
      invoice: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({ id: 'inv-1' })),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'inv-1',
            approvalStatus: ApprovalStatus.APPROVED,
          })),
      },
    };
  }

  beforeEach(async () => {
    mockPersistence = buildMockPersistence();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPersistence },
        { provide: CLOCK_PORT, useValue: { now: () => FIXED_NOW } },
      ],
    }).compile();
    service = module.get<ApprovalService>(ApprovalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('approvePrescription', () => {
    it('approves the prescription scoped to the clinic and bumps the version', async () => {
      const result = await service.approvePrescription(
        'rx-1',
        'user-1',
        'clinic-1',
      );

      expect(mockPersistence.prescription.findFirst).toHaveBeenCalledWith({
        where: { id: 'rx-1', appointment: { clinicId: 'clinic-1' } },
      });
      expect(mockPersistence.prescription.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'user-1',
          approvedAt: FIXED_NOW,
          version: { increment: 1 },
        },
      });
      expect(result).toEqual({
        success: true,
        prescription: { id: 'rx-1', approvalStatus: ApprovalStatus.APPROVED },
      });
    });

    it('throws NotFoundException when the prescription is outside the clinic scope', async () => {
      mockPersistence.prescription.findFirst.mockImplementation(
        async () => null,
      );

      await expect(
        service.approvePrescription('rx-1', 'user-1', 'clinic-1'),
      ).rejects.toThrow('Prescription with ID rx-1 not found');
      expect(mockPersistence.prescription.update).not.toHaveBeenCalled();
    });
  });

  describe('approveInvoice', () => {
    it('approves the invoice scoped to the clinic without a version bump', async () => {
      const result = await service.approveInvoice('inv-1', 'user-1', 'clinic-1');

      expect(mockPersistence.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', appointment: { clinicId: 'clinic-1' } },
      });
      expect(mockPersistence.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'user-1',
          approvedAt: FIXED_NOW,
        },
      });
      expect(result).toEqual({
        success: true,
        invoice: { id: 'inv-1', approvalStatus: ApprovalStatus.APPROVED },
      });
    });

    it('throws NotFoundException when the invoice is outside the clinic scope', async () => {
      mockPersistence.invoice.findFirst.mockImplementation(async () => null);

      await expect(
        service.approveInvoice('inv-1', 'user-1', 'clinic-1'),
      ).rejects.toThrow('Invoice with ID inv-1 not found');
      expect(mockPersistence.invoice.update).not.toHaveBeenCalled();
    });
  });
});
