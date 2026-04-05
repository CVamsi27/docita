import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IUserRepository,
  UserProfile,
} from '@/domains/users/core/repositories/user.repository.interface';
import { OnboardingStep } from '@workspace/db';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { id } }),
    );
  }

  async findByEmail(email: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { email } }),
    );
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<UserProfile> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );
  }

  async updateOnboardingStep(userId: string, step: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: step as OnboardingStep },
      }),
    );
  }
}
