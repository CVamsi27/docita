import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionService } from '@/common/encryption.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ResolvedWhatsappSender } from '@/domains/whatsapp/application/ports/whatsapp-client.port';

export const WHATSAPP_ACCESS_TOKEN_SECRET_KIND = 'WHATSAPP_ACCESS_TOKEN';

@Injectable()
export class WhatsappSenderResolver {
  private readonly logger = new Logger(WhatsappSenderResolver.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: AppConfigService,
  ) {}

  resolveShared(): ResolvedWhatsappSender {
    const meta = this.configService.getMetaConfig();
    return {
      phoneNumberId: meta.phoneNumberId,
      accessToken: meta.accessToken,
      mode: 'SHARED',
      senderPhoneNumberId: null,
      displayName: null,
      fallbackActive: false,
    };
  }

  async resolve(clinicId: string): Promise<ResolvedWhatsappSender> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        whatsappSenderMode: true,
        whatsappSenderStatus: true,
        whatsappPhoneNumberId: true,
        whatsappDisplayName: true,
      },
    });

    if (!clinic || clinic.whatsappSenderMode === 'SHARED') {
      return this.resolveShared();
    }

    if (
      clinic.whatsappSenderStatus !== 'VERIFIED' ||
      !clinic.whatsappPhoneNumberId
    ) {
      this.logger.warn(
        `WhatsApp sender fallback to shared for clinic ${clinicId}: mode=${clinic.whatsappSenderMode}, status=${clinic.whatsappSenderStatus}`,
      );
      return { ...this.resolveShared(), fallbackActive: true };
    }

    const secret = await this.prisma.clinicSecret.findUnique({
      where: {
        clinicId_kind: {
          clinicId,
          kind: WHATSAPP_ACCESS_TOKEN_SECRET_KIND,
        },
      },
      select: { ciphertext: true },
    });

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
