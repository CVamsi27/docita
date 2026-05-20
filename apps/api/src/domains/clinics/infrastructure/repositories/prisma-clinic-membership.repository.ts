import { Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IClinicMembershipRepository,
  UserForClinicJoin,
} from '@/domains/clinics/core/repositories/clinic-membership.repository.interface';

@Injectable()
export class PrismaClinicMembershipRepository
  implements IClinicMembershipRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findUserForJoin(userId: string): Promise<UserForClinicJoin | null> {
    return this.getReadClient().user.findFirst({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true },
    });
  }

  async joinClinic(
    userId: string,
    clinicId: string,
    userRole: Role,
  ): Promise<void> {
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { clinicId },
        });

        if (userRole === Role.DOCTOR || userRole === Role.ADMIN_DOCTOR) {
          await tx.doctorClinic.upsert({
            where: { doctorId_clinicId: { doctorId: userId, clinicId } },
            create: {
              doctorId: userId,
              clinicId,
              role: userRole === Role.ADMIN_DOCTOR ? 'admin_doctor' : 'doctor',
              active: true,
            },
            update: { active: true },
          });
        }
      });
    });
  }
}
