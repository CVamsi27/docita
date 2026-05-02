import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JoinRequestsController } from './join-requests.controller';
import { JoinRequestService } from '@/domains/clinics/application/services/join-request.service';
import { StaffNotificationService } from '@/shared/modules/messaging/whatsapp/staff-notification.service';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import type { RequestWithUser } from '@/common/types/common.types';

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

const mockUser = {
  id: 'user-1',
  name: 'Dr. Test',
  email: 'test@clinic.com',
  role: 'DOCTOR' as const,
  clinicId: null,
};

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@clinic.com',
  role: 'ADMIN' as const,
  clinicId: 'clinic-1',
};

const mockJoinRequestService = {
  create: jest.fn(),
  findById: jest.fn(),
  findPending: jest.fn(),
  findUserPendingRequests: jest.fn(),
  findByClinic: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  withdraw: jest.fn(),
};

const mockStaffNotificationService = {
  notifyStaff: jest.fn(),
};

describe('JoinRequestsController', () => {
  let controller: JoinRequestsController;
  let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JoinRequestsController],
      providers: [
        { provide: JoinRequestService, useValue: mockJoinRequestService },
        {
          provide: StaffNotificationService,
          useValue: mockStaffNotificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JoinRequestsController>(JoinRequestsController);
    jest.clearAllMocks();
  });

  describe('createJoinRequest', () => {
    const req = { user: mockUser, clinic: undefined } as RequestWithUser;
    const dto = {
      clinicId: 'clinic-1',
      requestedRole: 'DOCTOR' as const,
      message: 'Looking to join',
    };

    it('creates a join request and sends notification', async () => {
      mockJoinRequestService.findPending.mockResolvedValue(null);
      mockJoinRequestService.create.mockResolvedValue(mockRequest);
      mockStaffNotificationService.notifyStaff.mockResolvedValue(undefined);

      const result = await controller.createJoinRequest(req, dto);

      expect(mockJoinRequestService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        clinicId: 'clinic-1',
        requestedRole: 'DOCTOR',
        message: 'Looking to join',
      });
      expect(mockStaffNotificationService.notifyStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          type: 'MEMBER_JOIN_REQUEST',
          priority: 'HIGH',
        }),
      );
      expect(result).toEqual({
        success: true,
        requestId: 'req-1',
        status: 'PENDING',
        message: 'Join request submitted successfully',
      });
    });

    it('throws BadRequestException when user already has a clinic', async () => {
      const reqWithClinic = {
        user: { ...mockUser, clinicId: 'existing-clinic' },
      } as RequestWithUser;

      await expect(
        controller.createJoinRequest(reqWithClinic, dto),
      ).rejects.toThrow(BadRequestException);
      expect(mockJoinRequestService.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a pending request already exists', async () => {
      mockJoinRequestService.findPending.mockResolvedValue(mockRequest);

      await expect(controller.createJoinRequest(req, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockJoinRequestService.create).not.toHaveBeenCalled();
    });

    it('still succeeds if notification fails', async () => {
      mockJoinRequestService.findPending.mockResolvedValue(null);
      mockJoinRequestService.create.mockResolvedValue(mockRequest);
      mockStaffNotificationService.notifyStaff.mockRejectedValue(
        new Error('WhatsApp unavailable'),
      );

      const result = await controller.createJoinRequest(req, dto);

      expect(result.success).toBe(true);
    });
  });

  describe('listJoinRequests', () => {
    it('returns join requests for admin clinic', async () => {
      const req = { user: mockAdminUser } as RequestWithUser;
      mockJoinRequestService.findByClinic.mockResolvedValue([mockRequest]);

      const result = await controller.listJoinRequests(req, 'PENDING');

      expect(mockJoinRequestService.findByClinic).toHaveBeenCalledWith(
        'clinic-1',
        'PENDING',
      );
      expect(result).toHaveLength(1);
    });

    it('returns all requests when no status filter provided', async () => {
      const req = { user: mockAdminUser } as RequestWithUser;
      mockJoinRequestService.findByClinic.mockResolvedValue([mockRequest]);

      await controller.listJoinRequests(req);

      expect(mockJoinRequestService.findByClinic).toHaveBeenCalledWith(
        'clinic-1',
        undefined,
      );
    });
  });

  describe('getMyJoinRequest', () => {
    it('returns the first pending request for the user', async () => {
      const req = { user: mockUser } as RequestWithUser;
      mockJoinRequestService.findUserPendingRequests.mockResolvedValue([
        mockRequest,
      ]);

      const result = await controller.getMyJoinRequest(req);

      expect(result).toEqual(mockRequest);
    });

    it('returns null when user has no pending requests', async () => {
      const req = { user: mockUser } as RequestWithUser;
      mockJoinRequestService.findUserPendingRequests.mockResolvedValue([]);

      const result = await controller.getMyJoinRequest(req);

      expect(result).toBeNull();
    });
  });

  describe('countPendingRequests', () => {
    it('returns the count of pending requests', async () => {
      const req = { user: mockAdminUser } as RequestWithUser;
      mockJoinRequestService.findByClinic.mockResolvedValue([
        mockRequest,
        mockRequest,
      ]);

      const result = await controller.countPendingRequests(req);

      expect(mockJoinRequestService.findByClinic).toHaveBeenCalledWith(
        'clinic-1',
        'PENDING',
      );
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('approveJoinRequest', () => {
    const req = {
      user: mockAdminUser,
      clinic: { id: 'clinic-1', name: 'Test Clinic' },
    } as RequestWithUser;
    const dto = { assignedRole: 'DOCTOR' as const, welcomeMessage: 'Welcome!' };

    it('approves a request and notifies the user', async () => {
      mockJoinRequestService.findById.mockResolvedValue(mockRequest);
      mockJoinRequestService.approve.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });
      mockStaffNotificationService.notifyStaff.mockResolvedValue(undefined);

      const result = await controller.approveJoinRequest(req, 'req-1', dto);

      expect(mockJoinRequestService.approve).toHaveBeenCalledWith(
        'req-1',
        'admin-1',
        'Admin User',
        'DOCTOR',
        'Welcome!',
      );
      expect(mockStaffNotificationService.notifyStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MEMBER_JOIN_APPROVED',
          doctorId: 'user-1',
          priority: 'HIGH',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Request approved successfully',
      });
    });

    it('throws NotFoundException when request belongs to different clinic', async () => {
      mockJoinRequestService.findById.mockResolvedValue({
        ...mockRequest,
        clinicId: 'other-clinic',
      });

      await expect(
        controller.approveJoinRequest(req, 'req-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when request does not exist', async () => {
      mockJoinRequestService.findById.mockResolvedValue(null);

      await expect(
        controller.approveJoinRequest(req, 'req-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('still succeeds if approval notification fails', async () => {
      mockJoinRequestService.findById.mockResolvedValue(mockRequest);
      mockJoinRequestService.approve.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });
      mockStaffNotificationService.notifyStaff.mockRejectedValue(
        new Error('service down'),
      );

      const result = await controller.approveJoinRequest(req, 'req-1', dto);

      expect(result.success).toBe(true);
    });
  });

  describe('rejectJoinRequest', () => {
    const req = {
      user: mockAdminUser,
      clinic: { id: 'clinic-1', name: 'Test Clinic' },
    } as RequestWithUser;
    const dto = { reason: 'Does not meet requirements' };

    it('rejects a request and notifies the user', async () => {
      mockJoinRequestService.findById.mockResolvedValue(mockRequest);
      mockJoinRequestService.reject.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
      });
      mockStaffNotificationService.notifyStaff.mockResolvedValue(undefined);

      const result = await controller.rejectJoinRequest(req, 'req-1', dto);

      expect(mockJoinRequestService.reject).toHaveBeenCalledWith(
        'req-1',
        'admin-1',
        'Admin User',
        'Does not meet requirements',
      );
      expect(mockStaffNotificationService.notifyStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MEMBER_JOIN_REJECTED',
          priority: 'NORMAL',
        }),
      );
      expect(result).toEqual({ success: true, message: 'Request rejected' });
    });

    it('throws NotFoundException when request belongs to different clinic', async () => {
      mockJoinRequestService.findById.mockResolvedValue({
        ...mockRequest,
        clinicId: 'other-clinic',
      });

      await expect(
        controller.rejectJoinRequest(req, 'req-1', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('withdrawJoinRequest', () => {
    it('withdraws a join request', async () => {
      const req = { user: mockUser } as RequestWithUser;
      mockJoinRequestService.withdraw.mockResolvedValue({
        ...mockRequest,
        status: 'WITHDRAWN',
      });

      const result = await controller.withdrawJoinRequest(req, 'req-1');

      expect(mockJoinRequestService.withdraw).toHaveBeenCalledWith(
        'req-1',
        'user-1',
      );
      expect(result).toEqual({ success: true, message: 'Request withdrawn' });
    });
  });
});
