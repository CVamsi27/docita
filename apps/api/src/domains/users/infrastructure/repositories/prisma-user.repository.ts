import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { jsonObjectSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { z } from 'zod';
import {
  GuidedTourStateRecord,
  GuidedTourUpdate,
  IUserRepository,
  JwtValidationUserSnapshot,
  UserProfile,
} from '@/domains/users/core/repositories/user.repository.interface';
import { DataSubjectRequestType, OnboardingStep, Prisma } from '@workspace/db';

const ACCOUNT_DELETION_SLA_DAYS = 30;

const onboardingStepSchema = z.nativeEnum(OnboardingStep);

// Shared by `getProfile` and `updateProfile` — both project the same
// `UserProfile` columns (including the raw `verificationData` JSON the
// preference helpers below decode), so keeping the projection in one place
// stops the read and write paths from drifting on which fields are exposed.
const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  verificationData: true,
} satisfies Prisma.UserSelect;

const GUIDED_TOUR_SELECT = {
  guidedTourStatus: true,
  guidedTourLastStep: true,
  guidedTourCompletedAt: true,
  checklistDismissedAt: true,
} satisfies Prisma.UserSelect;

function verificationDataRecord(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  const parsed = parsePrismaJsonColumn(value, jsonObjectSchema);
  return parsed ?? {};
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async findById(id: string) {
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { id } }),
    );
  }

  async findByIdForJwtValidation(
    id: string,
  ): Promise<JwtValidationUserSnapshot | null> {
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
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
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({ where: { email } }),
    );
  }

  async recordAccountDeletionRequest(
    userId: string,
  ): Promise<{ requestId: string | null; requestedAt: Date }> {
    // RLS-BYPASS: staff account lifecycle precedes clinic tenant binding.
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, clinicId: true, deletedAt: true },
      });
      if (!user) throw new NotFoundException(`User ${userId} not found`);

      const now = this.clock.now();
      // Soft-delete + disable login so the account is unusable immediately; the
      // retention sweep anonymizes it after the obligation window. Preserve an
      // earlier deletedAt if the request is repeated.
      await this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: user.deletedAt ?? now, appLoginDisabled: true },
      });

      // Track the request in the compliance queue when the user belongs to a
      // clinic (DataSubjectRequest.clinicId is required). Platform/INTERNAL
      // users have no clinic; the soft-delete above is still recorded.
      let requestId: string | null = null;
      if (user.clinicId) {
        const dueAt = new Date(
          now.getTime() + ACCOUNT_DELETION_SLA_DAYS * 24 * 60 * 60 * 1000,
        );
        const request = await this.prisma.dataSubjectRequest.create({
          data: {
            clinicId: user.clinicId,
            requestType: DataSubjectRequestType.DELETION,
            requestChannel: 'STAFF_SELF_SERVICE',
            requestedByName: user.name,
            requestDetails: `Staff account deletion request for user ${userId}`,
            dueAt,
          },
          select: { id: true },
        });
        requestId = request.id;
      }

      return { requestId, requestedAt: now };
    });
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    // RLS-BYPASS: user self-profile lookup precedes clinic tenant binding
    return this.prisma.runUnrestricted(async () => {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: USER_PROFILE_SELECT,
      });
      if (!row) return null;
      const prefs = verificationDataRecord(row.verificationData);
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
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
    return this.prisma.runUnrestricted(async () => {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { verificationData: true },
      });
      const current = verificationDataRecord(existing?.verificationData);
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
            verificationData: toPrismaInputJsonValue(nextPrefs),
          }),
        },
        select: USER_PROFILE_SELECT,
      });
      const prefs =
        parsePrismaJsonColumn(updated.verificationData, jsonObjectSchema) ?? {};
      const override = prefs['sidebarNavOrderOverride'];
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        sidebarNavOrderOverride: override === undefined ? undefined : override,
      };
    });
  }

  async updateOnboardingStep(userId: string, step: string): Promise<void> {
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
    await this.prisma.runUnrestricted(async () =>
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: onboardingStepSchema.parse(step) },
      }),
    );
  }

  async getGuidedTour(userId: string): Promise<GuidedTourStateRecord | null> {
    // RLS-BYPASS: guided-tour state is keyed by user id, not clinic-scoped
    return this.prisma.runUnrestricted(async () => {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: GUIDED_TOUR_SELECT,
      });
      if (!row) return null;
      return {
        status: row.guidedTourStatus,
        lastStep: row.guidedTourLastStep,
        completedAt: row.guidedTourCompletedAt,
        checklistDismissedAt: row.checklistDismissedAt,
      };
    });
  }

  async updateGuidedTour(
    userId: string,
    patch: GuidedTourUpdate,
  ): Promise<GuidedTourStateRecord> {
    // RLS-BYPASS: guided-tour state is keyed by user id, not clinic-scoped
    return this.prisma.runUnrestricted(async () => {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(patch.status !== undefined && { guidedTourStatus: patch.status }),
          ...(patch.lastStep !== undefined && {
            guidedTourLastStep: patch.lastStep,
          }),
          ...(patch.completedAt !== undefined && {
            guidedTourCompletedAt: patch.completedAt,
          }),
          ...(patch.checklistDismissedAt !== undefined && {
            checklistDismissedAt: patch.checklistDismissedAt,
          }),
        },
        select: GUIDED_TOUR_SELECT,
      });
      return {
        status: updated.guidedTourStatus,
        lastStep: updated.guidedTourLastStep,
        completedAt: updated.guidedTourCompletedAt,
        checklistDismissedAt: updated.checklistDismissedAt,
      };
    });
  }

  async findPasswordExpiresAt(userId: string): Promise<Date | null> {
    // RLS-BYPASS: user lookup by identifier precedes clinic tenant binding
    return this.prisma.runUnrestricted(async () => {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordExpiresAt: true },
      });
      return row?.passwordExpiresAt ?? null;
    });
  }
}
