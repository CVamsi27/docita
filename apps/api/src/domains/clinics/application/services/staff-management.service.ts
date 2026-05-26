import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role, Specialization } from '@workspace/db';
import {
  actorMayAssignMemberRoles,
  isClinicFrontDesk,
  type CreateClinicMemberData,
  type CreateDoctorData,
  type CreateReceptionistData,
  type UpdateMemberData,
} from './staff-management-helpers';
import { StaffInviteService } from './staff-invite.service';

@Injectable()
export class StaffManagementService {
  constructor(
    private prisma: PrismaService,
    private staffInviteService: StaffInviteService,
  ) {}

  createDoctor(clinicId: string, data: CreateDoctorData) {
    return this.staffInviteService.createDoctor(clinicId, data);
  }

  createMember(clinicId: string, data: CreateClinicMemberData) {
    return this.staffInviteService.createMember(clinicId, data);
  }

  createReceptionist(clinicId: string, data: CreateReceptionistData) {
    return this.staffInviteService.createReceptionist(clinicId, data);
  }

  async getDoctors(clinicId: string) {
    return this.persistence.user.findMany({
      where: {
        clinicId,
        role: Role.DOCTOR,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getReceptionists(clinicId: string) {
    return this.persistence.user.findMany({
      where: {
        clinicId,
        role: Role.RECEPTIONIST,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMembers(clinicId: string) {
    return this.persistence.user.findMany({
      where: {
        clinicId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationReason: true,
        verificationCheckedAt: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateMember(
    clinicId: string,
    memberId: string,
    data: UpdateMemberData,
    actorUserId: string,
    actorRole: Role,
  ) {
    const member = await this.persistence.user.findFirst({
      where: {
        id: memberId,
        clinicId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this clinic');
    }

    if (actorUserId === memberId && data.role && data.role !== member.role) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (
      data.role &&
      ![
        Role.DOCTOR,
        Role.NURSE,
        Role.RECEPTIONIST,
        Role.ADMIN,
        Role.ADMIN_DOCTOR,
      ].includes(data.role)
    ) {
      throw new BadRequestException('Invalid role for clinic member update');
    }

    if (data.role && data.role !== member.role) {
      if (!actorMayAssignMemberRoles(actorRole)) {
        throw new ForbiddenException('Only admins can change member roles');
      }
    }

    const isFrontDesk = await isClinicFrontDesk(this.prisma, clinicId);
    if (data.role) {
      if (isFrontDesk) {
        if (data.role === 'NURSE' || data.role === 'ADMIN_DOCTOR') {
          throw new BadRequestException(
            'This role is not available for the front desk workspace.',
          );
        }
      }
    }

    let appLoginDisabled: boolean | undefined;
    if (data.role !== undefined) {
      if (data.role === 'DOCTOR' && isFrontDesk) {
        appLoginDisabled = true;
      } else if (data.role !== 'DOCTOR') {
        appLoginDisabled = false;
      }
    }

    const updated = await this.persistence.user.update({
      where: { id: memberId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phoneNumber !== undefined
          ? { phoneNumber: data.phoneNumber }
          : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(appLoginDisabled !== undefined ? { appLoginDisabled } : {}),
        ...(data.specialization !== undefined
          ? {
              specialization:
                parseStringEnumMember(
                  Object.values(Specialization),
                  data.specialization,
                ) ?? undefined,
            }
          : {}),
        ...(data.qualification !== undefined
          ? { qualification: data.qualification }
          : {}),
        ...(data.registrationNumber !== undefined
          ? { registrationNumber: data.registrationNumber }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationReason: true,
        verificationCheckedAt: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async removeMember(clinicId: string, memberId: string, actorUserId: string) {
    const member = await this.persistence.user.findFirst({
      where: {
        id: memberId,
        clinicId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this clinic');
    }

    if (actorUserId === memberId) {
      throw new BadRequestException('You cannot remove your own account');
    }

    if (member.role === Role.ADMIN) {
      throw new ForbiddenException('Admin account cannot be removed here');
    }

    await this.persistence.user.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
}
