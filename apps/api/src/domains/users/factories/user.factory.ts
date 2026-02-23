import { Injectable } from '@nestjs/common';
import { Role, Prisma } from '@workspace/db';

@Injectable()
export class UserFactory {
  create(
    role: Role,
    data: {
      email: string;
      name: string;
      passwordHash: string;
      clinicId?: string;
    },
  ): Prisma.UserCreateInput {
    const baseUser: Prisma.UserCreateInput = {
      email: data.email,
      name: data.name,
      password: data.passwordHash,
      role: role,
      clinic: data.clinicId ? { connect: { id: data.clinicId } } : undefined,
    };

    switch (role) {
      case Role.DOCTOR:
        // Future: Initialize Doctor Profile or Settings
        break;
      case Role.RECEPTIONIST:
        // Future: Initialize Receptionist specific settings
        break;
      case Role.ADMIN:
        // Admin specific defaults
        break;
      default:
        break;
    }

    return baseUser;
  }
}
