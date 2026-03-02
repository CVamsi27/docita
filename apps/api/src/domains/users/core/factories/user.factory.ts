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
        break;
      case Role.RECEPTIONIST:
        break;
      case Role.ADMIN:
        break;
      default:
        break;
    }

    return baseUser;
  }
}
