import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IUserRepository,
  JwtValidationUserSnapshot,
  UserProfile,
} from '@/domains/users/core/repositories/user.repository.interface';
import { OnboardingStep, Prisma } from '@workspace/db';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  async findById(id: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { id } }),
    );
  }

  async findByIdForJwtValidation(
    id: string,
  ): Promise<JwtValidationUserSnapshot | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          clinicId: true,
          emailVerified: true,
          onboardingStep: true,
          appLoginDisabled: true,
        },
      }),
    );
  }

  async findByEmail(email: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { email } }),
    );
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.prisma.runUnrestricted(async () => {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          verificationData: true,
        },
      });
      if (!row) return null;
      const prefs =
        row.verificationData && typeof row.verificationData === 'object'
          ? (row.verificationData as Record<string, unknown>)
          : {};
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        sidebarNavOrderOverride: prefs['sidebarNavOrderOverride'],
      };
    });
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      sidebarNavOrderOverride?: unknown | null;
    },
  ): Promise<UserProfile> {
    return this.prisma.runUnrestricted(async () => {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { verificationData: true },
      });
      const current =
        existing?.verificationData &&
        typeof existing.verificationData === 'object'
          ? (existing.verificationData as Record<string, unknown>)
          : {};

      const nextPrefs =
        data.sidebarNavOrderOverride === undefined
          ? current
          : data.sidebarNavOrderOverride === null
            ? Object.fromEntries(
                Object.entries(current).filter(
                  ([key]) => key !== 'sidebarNavOrderOverride',
                ),
              )
            : {
                ...current,
                sidebarNavOrderOverride: data.sidebarNavOrderOverride,
              };

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.sidebarNavOrderOverride !== undefined && {
            verificationData: this.toInputJsonValue(nextPrefs),
          }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          verificationData: true,
        },
      });

      const prefs =
        updated.verificationData && typeof updated.verificationData === 'object'
          ? (updated.verificationData as Record<string, unknown>)
          : {};

      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        sidebarNavOrderOverride:
          prefs['sidebarNavOrderOverride'] === undefined
            ? undefined
            : prefs['sidebarNavOrderOverride'],
      };
    });
  }

  async updateOnboardingStep(userId: string, step: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: step as OnboardingStep },
      }),
    );
  }

  async findPasswordExpiresAt(userId: string): Promise<Date | null> {
    return this.prisma.runUnrestricted(async () => {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordExpiresAt: true },
      });
      return row?.passwordExpiresAt ?? null;
    });
  }
}
