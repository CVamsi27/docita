import { ForbiddenException } from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { Role } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StaffManagementService } from './staff-management.service';
import { StaffInviteService } from './staff-invite.service';

describe('StaffManagementService', () => {
  let service: StaffManagementService;
  let prisma: {
    clinic: {
      findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    user: {
      findFirst: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  beforeEach(() => {
    prisma = {
      clinic: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({
            settings: { workspaceProfile: 'FULL_CLINICAL' },
          }),
      },
      user: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    service = new StaffManagementService(
      prisma as unknown as ClinicPersistencePort,
      Object.create(StaffInviteService.prototype) as StaffInviteService,
    );
  });

  describe('updateMember', () => {
    const clinicId = 'clinic-1';
    const memberId = 'member-1';

    it('allows admins to change a member role between staff roles (e.g. RECEPTIONIST to NURSE)', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: memberId,
        role: Role.RECEPTIONIST,
      });
      prisma.user.update.mockResolvedValue({
        id: memberId,
        role: Role.NURSE,
        name: 'Test',
        email: 't@test.com',
        phoneNumber: null,
        specialization: null,
        qualification: null,
        registrationNumber: null,
        signatureUploadedAt: null,
        verificationStatus: null,
        verificationReason: null,
        verificationCheckedAt: null,
        profilePhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateMember(
        clinicId,
        memberId,
        { role: 'NURSE' },
        'admin-actor',
        Role.ADMIN,
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: memberId },
          data: expect.objectContaining({ role: Role.NURSE }),
        }),
      );
    });

    it('allows ADMIN_DOCTOR actors to change another member role to DOCTOR', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: memberId,
        role: Role.RECEPTIONIST,
      });
      prisma.user.update.mockResolvedValue({
        id: memberId,
        role: Role.DOCTOR,
        name: 'Test',
        email: 't@test.com',
        phoneNumber: null,
        specialization: null,
        qualification: null,
        registrationNumber: null,
        signatureUploadedAt: null,
        verificationStatus: null,
        verificationReason: null,
        verificationCheckedAt: null,
        profilePhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateMember(
        clinicId,
        memberId,
        { role: 'DOCTOR' },
        'admin-doc-actor',
        Role.ADMIN_DOCTOR,
      );

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('forbids non-admin actors from changing member roles', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: memberId,
        role: Role.RECEPTIONIST,
      });

      await expect(
        service.updateMember(
          clinicId,
          memberId,
          { role: 'NURSE' },
          'doctor-actor',
          Role.DOCTOR,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
