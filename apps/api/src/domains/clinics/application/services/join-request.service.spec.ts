import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { JoinRequestService } from './join-request.service';
import { JoinRequestCommandService } from './join-request-command.service';
import { JoinRequestQueryService } from './join-request-query.service';
import { JOIN_REQUEST_REPOSITORY_TOKEN } from '@/domains/clinics/core/repositories/join-request.repository.interface';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';

const mockRequest = {
  id: 'req-1',
  userId: 'user-1',
  clinicId: 'clinic-1',
  requestedRole: 'DOCTOR' as const,
  message: 'Looking to join',
  status: 'PENDING' as const,
  approvedById: null,
  approvedByName: null,
  responseMessage: null,
  requestedAt: new Date(),
  respondedAt: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  user: { id: 'user-1', name: 'Dr. Test', email: 'test@clinic.com' },
  clinic: { id: 'clinic-1', name: 'Test Clinic' },
};

describe('JoinRequestService', () => {
  let service: JoinRequestService;
  let repository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  beforeEach(async () => {
    repository = {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findPending: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUserPendingRequests:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findByClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      approve: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      reject: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      withdraw: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      expireOldRequests: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRequestQueryService,
        JoinRequestCommandService,
        JoinRequestService,
        { provide: JOIN_REQUEST_REPOSITORY_TOKEN, useValue: repository },
        { provide: CLOCK_PORT, useValue: { now: () => new Date() } },
      ],
    }).compile();

    service = module.get<JoinRequestService>(JoinRequestService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a join request with 7-day expiry', async () => {
      repository.create.mockResolvedValue(mockRequest);

      const result = await service.create({
        userId: 'user-1',
        clinicId: 'clinic-1',
        requestedRole: 'DOCTOR',
        message: 'Looking to join',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          clinicId: 'clinic-1',
          requestedRole: 'DOCTOR',
          expiresAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockRequest);
    });
  });

  describe('findById', () => {
    it('returns a request by id', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      const result = await service.findById('req-1');

      expect(repository.findById).toHaveBeenCalledWith('req-1');
      expect(result).toEqual(mockRequest);
    });

    it('returns null when not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findPending', () => {
    it('returns pending request for user+clinic combination', async () => {
      repository.findPending.mockResolvedValue(mockRequest);

      const result = await service.findPending('user-1', 'clinic-1');

      expect(repository.findPending).toHaveBeenCalledWith('user-1', 'clinic-1');
      expect(result).toEqual(mockRequest);
    });
  });

  describe('findByClinic', () => {
    it('returns all requests for a clinic', async () => {
      repository.findByClinic.mockResolvedValue([mockRequest]);

      const result = await service.findByClinic('clinic-1');

      expect(repository.findByClinic).toHaveBeenCalledWith(
        'clinic-1',
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it('filters by status when provided', async () => {
      repository.findByClinic.mockResolvedValue([mockRequest]);

      await service.findByClinic('clinic-1', 'PENDING');

      expect(repository.findByClinic).toHaveBeenCalledWith(
        'clinic-1',
        'PENDING',
      );
    });
  });

  describe('approve', () => {
    it('approves a pending request and calls repository approve', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: 'APPROVED' });
      repository.approve.mockResolvedValue(undefined);

      const result = await service.approve('req-1', 'admin-1', 'Admin User');

      expect(repository.approve).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
          userId: 'user-1',
          clinicId: 'clinic-1',
          approvedById: 'admin-1',
          approvedByName: 'Admin User',
          finalRole: 'DOCTOR',
        }),
      );
      expect(result).toEqual(expect.objectContaining({ status: 'APPROVED' }));
    });

    it('passes assigned role override to repository', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: 'APPROVED' });
      repository.approve.mockResolvedValue(undefined);

      await service.approve('req-1', 'admin-1', 'Admin User', 'ADMIN_DOCTOR');

      expect(repository.approve).toHaveBeenCalledWith(
        expect.objectContaining({ finalRole: 'ADMIN_DOCTOR' }),
      );
    });

    it('throws NotFoundException when request does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.approve('nonexistent', 'admin-1', 'Admin User'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when request is not PENDING', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });

      await expect(
        service.approve('req-1', 'admin-1', 'Admin User'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('rejects a pending request and calls repository reject', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: 'REJECTED' });
      repository.reject.mockResolvedValue(undefined);

      const result = await service.reject(
        'req-1',
        'admin-1',
        'Admin User',
        'Not a match',
      );

      expect(repository.reject).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
          userId: 'user-1',
          reason: 'Not a match',
        }),
      );
      expect(result).toEqual(expect.objectContaining({ status: 'REJECTED' }));
    });

    it('throws NotFoundException when request does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.reject('nonexistent', 'admin-1', 'Admin User', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when request is not PENDING', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
      });

      await expect(
        service.reject('req-1', 'admin-1', 'Admin User', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    it('withdraws a pending request by the owning user', async () => {
      repository.findById
        .mockResolvedValueOnce(mockRequest)
        .mockResolvedValueOnce({ ...mockRequest, status: 'WITHDRAWN' });
      repository.withdraw.mockResolvedValue(undefined);

      const result = await service.withdraw('req-1', 'user-1');

      expect(repository.withdraw).toHaveBeenCalledWith({
        requestId: 'req-1',
        userId: 'user-1',
      });
      expect(result).toEqual(expect.objectContaining({ status: 'WITHDRAWN' }));
    });

    it('throws BadRequestException when a different user tries to withdraw', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      await expect(service.withdraw('req-1', 'other-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when withdrawing a non-PENDING request', async () => {
      repository.findById.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });

      await expect(service.withdraw('req-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when request does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.withdraw('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('expireOldRequests', () => {
    it('delegates to repository and returns count', async () => {
      repository.expireOldRequests.mockResolvedValue(3);

      const count = await service.expireOldRequests();

      expect(repository.expireOldRequests).toHaveBeenCalled();
      expect(count).toBe(3);
    });

    it('returns 0 when no requests have expired', async () => {
      repository.expireOldRequests.mockResolvedValue(0);

      const count = await service.expireOldRequests();

      expect(count).toBe(0);
    });
  });
});
