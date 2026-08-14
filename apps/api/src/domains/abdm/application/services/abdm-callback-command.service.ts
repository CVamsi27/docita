import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AbdmGatewayCallback } from '@workspace/types';
import { AbdmExchangeService } from '@/domains/abdm/application/services/abdm-exchange.service';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import { WebhookVerifierService } from '@/shared/modules/webhooks';

@Injectable()
export class AbdmCallbackCommandService {
  constructor(
    private readonly exchange: AbdmExchangeService,
    private readonly integrationsConfig: ExternalIntegrationsConfigService,
    private readonly webhookVerifier: WebhookVerifierService,
  ) {}

  async recordCallback(input: {
    clinicId: string;
    type: string;
    rawBody: Buffer;
    sharedSecretHeader?: string;
    timestamp?: string;
    callback: AbdmGatewayCallback;
  }) {
    const callbackSecret =
      this.integrationsConfig.getAbdmConfig().callbackSecret;
    const verification = await this.webhookVerifier.verify({
      provider: 'abdm',
      rawBody: input.rawBody,
      signature: '',
      authMode: 'shared-secret-header',
      sharedSecretHeader: input.sharedSecretHeader,
      secret: callbackSecret ?? '',
      signedTimestampSeconds: input.timestamp
        ? Number(input.timestamp)
        : undefined,
    });

    if (!verification.ok) {
      if (verification.failure === 'replayed') {
        throw new ConflictException('Webhook already processed');
      }
      throw new UnauthorizedException('Invalid ABDM callback signature');
    }

    await this.exchange.recordGatewayCallback(
      input.clinicId,
      input.type,
      input.callback,
    );
    return { status: 'ok' };
  }
}
