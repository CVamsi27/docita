import { Injectable } from '@nestjs/common';
import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';
import { AbdmAbhaClient } from '@/domains/abdm/infrastructure/abdm-abha.client';
import { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import type { IAbdmGateway } from '@/domains/patients/core/ports/abha-verification.port';

/**
 * ABDM gateway adapter for ABHA verification (M1) and OTP-based login.
 *
 * This adapter lives in the patients domain infrastructure layer and delegates
 * to the abdm domain clients via NestJS DI — it is the only permitted import
 * path for cross-domain ABDM access from the patients domain.
 */
@Injectable()
export class AbdmHttpGateway implements IAbdmGateway {
  constructor(
    private readonly gateway: AbdmGatewayClient,
    private readonly abhaClient: AbdmAbhaClient,
  ) {}

  isConfigured(): boolean {
    return this.gateway.isConfigured();
  }

  async verifyAbha(input: VerifyAbhaRequest): Promise<AbhaVerificationResult> {
    return this.gateway.verifyAbha(input);
  }

  async requestOtp(
    mobile: string,
  ): Promise<{ txnId: string; maskedTarget: string | null }> {
    return this.abhaClient.requestOtp(mobile);
  }

  async verifyOtp(txnId: string, otp: string): Promise<AbhaVerificationResult> {
    return this.abhaClient.verifyOtp(txnId, otp);
  }
}
