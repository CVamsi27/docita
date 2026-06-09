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
  STAFF_CLINICAL_SELECT,
  STAFF_IDENTITY_SELECT,
  STAFF_TIMESTAMPS_SELECT,
  STAFF_VERIFICATION_SELECT,
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

  /**
   * Looks up a clinic member by id, projecting just the `id`/`role` pair both
   * `updateMember` and `removeMember` need before they can decide whether the
   * action is allowed — defined once so the lookup-and-guard shape can't drift
   * between the two mutations.
   */
  private findMemberRoleRecord(clinicId: string, memberId: string) {
    return this.persistence.user.findFirst({
      where: {
        id: memberId,
        clinicId,
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  async getDoctors(clinicId: string) {
    return this.persistence.user.findMany({
      where: {
        clinicId,
        role: Role.DOCTOR,
      },
      select: {
        ...STAFF_IDENTITY_SELECT,
        ...STAFF_CLINICAL_SELECT,
        ...STAFF_TIMESTAMPS_SELECT,
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
        ...STAFF_IDENTITY_SELECT,
        ...STAFF_TIMESTAMPS_SELECT,
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
        ...STAFF_IDENTITY_SELECT,
        hospitalRole: true,
        ...STAFF_CLINICAL_SELECT,
        ...STAFF_VERIFICATION_SELECT,
        ...STAFF_TIMESTAMPS_SELECT,
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
    const member = await this.findMemberRoleRecord(clinicId, memberId);

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
        ...STAFF_IDENTITY_SELECT,
        ...STAFF_CLINICAL_SELECT,
        ...STAFF_VERIFICATION_SELECT,
        ...STAFF_TIMESTAMPS_SELECT,
      },
    });

    return updated;
  }

  async removeMember(clinicId: string, memberId: string, actorUserId: string) {
    const member = await this.findMemberRoleRecord(clinicId, memberId);

    if (!member) throw new NotFoundException('Member not found in this clinic');

    if (actorUserId === memberId)
      throw new BadRequestException('You cannot remove your own account');

    if (member.role === Role.ADMIN)
      throw new ForbiddenException('Admin account cannot be removed here');

    await this.persistence.user.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
}
