import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import {
  Prisma,
  WhatsappSenderMode,
  WhatsappSenderStatus,
} from '@workspace/db';
import {
  Feature,
  UpdateWhatsappSenderRequest,
  WhatsappSenderConfigResponse,
} from '@workspace/types';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { EncryptionService } from '@/shared/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  assertClinicHasFeatureOrThrow,
  clinicHasFeatureForAccess,
} from '@/shared/modules/auth/utils/clinic-feature-access.util';
import type { ClinicFeatureAuthSnapshot } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { WHATSAPP_ACCESS_TOKEN_SECRET_KIND } from './whatsapp-sender-resolver.service';
import { MetaGraphPhoneProfileClient } from '@/domains/whatsapp/infrastructure/clients/meta-graph-phone-profile.client';

/**
 * Thin facade — delegates WhatsApp sender configuration to WhatsappPersistencePort.
 */
@Injectable()
export class WhatsappSenderSettingsService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly encryptionService: EncryptionService,
    private readonly configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly metaGraphPhoneProfile: MetaGraphPhoneProfileClient,
  ) {}

  async getConfig(clinicId: string): Promise<WhatsappSenderConfigResponse> {
    const clinic = await this.getClinic(clinicId);
    return {
      mode: clinic.whatsappSenderMode,
      status: clinic.whatsappSenderStatus,
      phoneNumberId: clinic.whatsappPhoneNumberId,
      wabaId: clinic.whatsappWabaId,
      displayName: clinic.whatsappDisplayName,
      verifiedAt: clinic.whatsappVerifiedAt?.toISOString() ?? null,
      tokenExpiresAt: clinic.whatsappTokenExpiresAt?.toISOString() ?? null,
      lastVerifyError: clinic.whatsappLastVerifyError,
      allowedModes: this.allowedModes(clinic),
      fallbackActive:
        clinic.whatsappSenderMode !== 'SHARED' &&
        clinic.whatsappSenderStatus !== 'VERIFIED',
    };
  }

  async updateConfig(
    clinicId: string,
    actorUserId: string,
    payload: UpdateWhatsappSenderRequest,
  ): Promise<WhatsappSenderConfigResponse> {
    if (!this.configService.isPerClinicWhatsappSenderEnabled()) {
      throw new ServiceUnavailableException(
        'Per-clinic WhatsApp sender settings are not enabled.',
      );
    }

    const clinic = await this.getClinic(clinicId);

    if (payload.mode === 'BYO') {
      if (!payload.phoneNumberId || !payload.accessToken) {
        throw new BadRequestException(
          'Phone number ID and access token are required for BYO sender mode.',
        );
      }
      assertClinicHasFeatureOrThrow(clinic, Feature.WHATSAPP_OWN_NUMBER);
      const encryptedToken = this.encryptionService.encrypt(
        payload.accessToken,
      );
      await this.persistence.$transaction(async (tx) => {
        await tx.clinic.update({
          where: { id: clinicId },
          data: {
            whatsappSenderMode: 'BYO',
            whatsappSenderStatus: 'PENDING_VERIFICATION',
            whatsappPhoneNumberId: payload.phoneNumberId,
            whatsappWabaId: payload.wabaId ?? null,
            whatsappDisplayName: null,
            whatsappVerifiedAt: null,
            whatsappTokenExpiresAt: null,
            whatsappLastVerifyError: null,
          },
        });
        await tx.clinicSecret.upsert({
          where: {
            clinicId_kind: {
              clinicId,
              kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND,
            },
          },
          update: {
            ciphertext: encryptedToken,
            rotatedAt: this.clock.now(),
          },
          create: {
            clinicId,
            kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND,
            ciphertext: encryptedToken,
          },
        });
        await this.writeAudit(tx, {
          clinicId,
          actorUserId,
          action: 'WHATSAPP_SENDER_MODE_CHANGED',
          entityId: clinicId,
          oldValue: { mode: clinic.whatsappSenderMode },
          newValue: { mode: 'BYO', phoneNumberId: payload.phoneNumberId },
        });
        await this.writeAudit(tx, {
          clinicId,
          actorUserId,
          action: 'CLINIC_SECRET_WRITTEN',
          entityId: clinicId,
          newValue: { kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND },
        });
      });
      return this.getConfig(clinicId);
    }

    if (payload.mode === 'MANAGED') {
      assertClinicHasFeatureOrThrow(clinic, Feature.WHATSAPP_MANAGED_NUMBER);
      await this.persistence.clinic.update({
        where: { id: clinicId },
        data: {
          whatsappSenderMode: 'MANAGED',
          whatsappSenderStatus: 'PENDING_VERIFICATION',
          whatsappLastVerifyError:
            'Managed onboarding is pending Docita support provisioning.',
        },
      });
      return this.getConfig(clinicId);
    }

    await this.revoke(clinicId, actorUserId);
    return this.getConfig(clinicId);
  }

  async verify(
    clinicId: string,
    actorUserId: string,
  ): Promise<{
    status: WhatsappSenderStatus;
    displayName: string | null;
    phoneNumberId: string | null;
    tokenExpiresAt: string | null;
    error: string | null;
  }> {
    const clinic = await this.getClinic(clinicId);
    if (clinic.whatsappSenderMode === 'SHARED') {
      throw new BadRequestException(
        'Shared sender does not need verification.',
      );
    }
    if (!clinic.whatsappPhoneNumberId) {
      throw new BadRequestException('WhatsApp phone number ID is missing.');
    }

    const secret = await this.persistence.clinicSecret.findUnique({
      where: {
        clinicId_kind: {
          clinicId,
          kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND,
        },
      },
      select: { ciphertext: true },
    });
    if (!secret) {
      throw new BadRequestException('WhatsApp access token is missing.');
    }

    const accessToken = this.encryptionService.decrypt(secret.ciphertext);
    try {
      const { ok, data } =
        await this.metaGraphPhoneProfile.fetchPhoneNumberProfile(
          clinic.whatsappPhoneNumberId,
          accessToken,
        );

      if (!ok) {
        throw new BadRequestException(
          data.error?.message || 'Meta verification failed',
        );
      }

      const displayName =
        data.verified_name || data.display_phone_number || null;
      await this.persistence.$transaction(async (tx) => {
        await tx.clinic.update({
          where: { id: clinicId },
          data: {
            whatsappSenderStatus: 'VERIFIED',
            whatsappDisplayName: displayName,
            whatsappVerifiedAt: this.clock.now(),
            whatsappLastVerifyError: null,
          },
        });
        await this.writeAudit(tx, {
          clinicId,
          actorUserId,
          action: 'WHATSAPP_SENDER_VERIFIED',
          entityId: clinicId,
          newValue: { mode: clinic.whatsappSenderMode, displayName },
        });
      });

      return {
        status: 'VERIFIED',
        displayName,
        phoneNumberId: clinic.whatsappPhoneNumberId,
        tokenExpiresAt: null,
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Meta verification failed';
      await this.persistence.$transaction(async (tx) => {
        await tx.clinic.update({
          where: { id: clinicId },
          data: {
            whatsappSenderStatus: 'FAILED',
            whatsappLastVerifyError: message,
          },
        });
        await this.writeAudit(tx, {
          clinicId,
          actorUserId,
          action: 'WHATSAPP_SENDER_VERIFY_FAILED',
          entityId: clinicId,
          newValue: { mode: clinic.whatsappSenderMode, error: message },
          status: 'FAILED',
          errorMessage: message,
        });
      });
      return {
        status: 'FAILED',
        displayName: null,
        phoneNumberId: clinic.whatsappPhoneNumberId,
        tokenExpiresAt: null,
        error: message,
      };
    }
  }

  async revoke(clinicId: string, actorUserId: string) {
    const clinic = await this.getClinic(clinicId);
    await this.persistence.$transaction(async (tx) => {
      await tx.clinicSecret.deleteMany({
        where: { clinicId, kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND },
      });
      await tx.clinic.update({
        where: { id: clinicId },
        data: {
          whatsappSenderMode: 'SHARED',
          whatsappSenderStatus: 'REVOKED',
          whatsappPhoneNumberId: null,
          whatsappWabaId: null,
          whatsappDisplayName: null,
          whatsappVerifiedAt: null,
          whatsappTokenExpiresAt: null,
          whatsappLastVerifyError: null,
        },
      });
      await this.writeAudit(tx, {
        clinicId,
        actorUserId,
        action: 'WHATSAPP_SENDER_REVOKED',
        entityId: clinicId,
        oldValue: {
          mode: clinic.whatsappSenderMode,
          phoneNumberId: clinic.whatsappPhoneNumberId,
        },
        newValue: { mode: 'SHARED' },
      });
      await this.writeAudit(tx, {
        clinicId,
        actorUserId,
        action: 'CLINIC_SECRET_DELETED',
        entityId: clinicId,
        oldValue: { kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND },
      });
    });
    return { mode: 'SHARED' as const, status: 'REVOKED' as const };
  }

  private async getClinic(clinicId: string) {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        tier: true,
        intelligenceAddon: true,
        features: true,
        whatsappSenderMode: true,
        whatsappSenderStatus: true,
        whatsappPhoneNumberId: true,
        whatsappWabaId: true,
        whatsappDisplayName: true,
        whatsappVerifiedAt: true,
        whatsappTokenExpiresAt: true,
        whatsappLastVerifyError: true,
      },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  private allowedModes(clinic: ClinicFeatureAuthSnapshot) {
    const modes: WhatsappSenderMode[] = ['SHARED'];
    if (clinicHasFeatureForAccess(clinic, Feature.WHATSAPP_OWN_NUMBER)) {
      modes.push('BYO');
    }
    if (clinicHasFeatureForAccess(clinic, Feature.WHATSAPP_MANAGED_NUMBER)) {
      modes.push('MANAGED');
    }
    return modes;
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    input: {
      clinicId: string;
      actorUserId: string;
      action: string;
      entityId: string;
      oldValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
      status?: string;
      errorMessage?: string;
    },
  ) {
    await tx.auditLog.create({
      data: {
        clinicId: input.clinicId,
        userId: input.actorUserId,
        action: input.action,
        entityType: 'Clinic',
        entityId: input.entityId,
        oldValue: input.oldValue ?? Prisma.JsonNull,
        newValue: input.newValue ?? Prisma.JsonNull,
        status: input.status ?? 'SUCCESS',
        errorMessage: input.errorMessage,
        metadata: Prisma.JsonNull,
      },
    });
  }
}
