import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { Role } from '@workspace/db';
import {
  isClinicFrontDesk,
  type CreateClinicMemberData,
  type CreateDoctorData,
  type CreateReceptionistData,
  type UpdateMemberData,
} from './staff-management-helpers';
import {
  assertCanUpdateMember,
  buildMemberUpdateData,
  resolveAppLoginDisabled,
} from './staff-member-update';
import { StaffInviteService } from './staff-invite.service';

@Injectable()
export class StaffManagementService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private readonly persistence: ClinicPersistencePort,
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

    const isFrontDesk = await isClinicFrontDesk(this.persistence, clinicId);
    assertCanUpdateMember({
      member,
      memberId,
      data,
      actorUserId,
      actorRole,
      isFrontDesk,
    });
    const appLoginDisabled = resolveAppLoginDisabled(data.role, isFrontDesk);

    const updated = await this.persistence.user.update({
      where: { id: memberId },
      data: buildMemberUpdateData(data, appLoginDisabled),
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
