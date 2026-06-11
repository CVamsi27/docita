import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { EncryptionService } from '@/shared/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ResolvedWhatsappSender } from '@/domains/whatsapp/application/ports/whatsapp-client.port';

export const WHATSAPP_ACCESS_TOKEN_SECRET_KIND = 'WHATSAPP_ACCESS_TOKEN';

/**
 * Looks up a clinic's encrypted WhatsApp access-token secret. Both the
 * resolver (deciding which sender to use) and the settings service
 * (verifying a clinic-owned sender) need this exact lookup — sharing it
 * keeps the `clinicId_kind`/`select` shape from drifting between them.
 */
export function fetchWhatsappAccessTokenSecret(
  persistence: WhatsappPersistencePort,
  clinicId: string,
) {
  return persistence.clinicSecret.findUnique({
    where: {
      clinicId_kind: {
        clinicId,
        kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND,
      },
    },
    select: { ciphertext: true },
  });
}

export function resolveSharedWhatsappSender(
  configService: AppConfigService,
): ResolvedWhatsappSender {
  const meta = configService.getMetaConfig();
  return {
    phoneNumberId: meta.phoneNumberId,
    accessToken: meta.accessToken,
    mode: 'SHARED',
    senderPhoneNumberId: null,
    displayName: null,
    fallbackActive: false,
  };
}

@Injectable()
export class WhatsappSenderResolver {
  private readonly logger = new Logger(WhatsappSenderResolver.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly encryptionService: EncryptionService,
    private readonly configService: AppConfigService,
  ) {}

  resolveShared(): ResolvedWhatsappSender {
    return resolveSharedWhatsappSender(this.configService);
  }

  async resolve(clinicId: string): Promise<ResolvedWhatsappSender> {
    // AuditLogged: whatsapp sender resolution
    this.logger.log({ action: 'whatsapp.resolve-sender', clinicId });

    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: {
        whatsappSenderMode: true,
        whatsappSenderStatus: true,
        whatsappPhoneNumberId: true,
        whatsappDisplayName: true,
      },
    });

    if (!clinic || clinic.whatsappSenderMode === 'SHARED')
      return this.resolveShared();

    if (
      clinic.whatsappSenderStatus !== 'VERIFIED' ||
      !clinic.whatsappPhoneNumberId
    ) {
      this.logger.warn(
        `WhatsApp sender fallback to shared for clinic ${clinicId}: mode=${clinic.whatsappSenderMode}, status=${clinic.whatsappSenderStatus}`,
      );
      return { ...this.resolveShared(), fallbackActive: true };
    }

    const secret = await fetchWhatsappAccessTokenSecret(
      this.persistence,
      clinicId,
    );

    if (!secret) {
      this.logger.warn(
        `WhatsApp sender fallback to shared for clinic ${clinicId}: missing access token secret`,
      );
      return { ...this.resolveShared(), fallbackActive: true };
    }

    return {
      phoneNumberId: clinic.whatsappPhoneNumberId,
      accessToken: this.encryptionService.decrypt(secret.ciphertext),
      mode: clinic.whatsappSenderMode,
      senderPhoneNumberId: clinic.whatsappPhoneNumberId,
      displayName: clinic.whatsappDisplayName,
      fallbackActive: false,
    };
  }
}
