import { Injectable } from '@nestjs/common';
import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';
import { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import type { IAbdmGateway } from '@/domains/patients/core/ports/abha-verification.port';

/**
 * ABDM gateway adapter for ABHA verification (M1).
 *
 * Until ABDM credentials are configured (sandbox or production), {@link isConfigured}
 * is false and {@link verifyAbha} returns `ABDM_NOT_CONFIGURED` — the endpoint
 * surfaces a clear "not enabled" state rather than failing. Once credentials
 * are set, the shared ABDM gateway client obtains a V3 session token before
 * making the outbound verification call.
 */
@Injectable()
export class AbdmHttpGateway implements IAbdmGateway {
  constructor(private readonly gateway: AbdmGatewayClient) {}

  isConfigured(): boolean {
    return this.gateway.isConfigured();
  }

  async verifyAbha(input: VerifyAbhaRequest): Promise<AbhaVerificationResult> {
    return this.gateway.verifyAbha(input);
  }
}
