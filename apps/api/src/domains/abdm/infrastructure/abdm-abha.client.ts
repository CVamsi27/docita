import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import { AbdmGatewayClient } from './abdm-gateway.client';
import {
  NOT_CONFIGURED,
  abdmBaseHeaders,
  isAbdmConfigured,
} from './abdm-shared';

@Injectable()
export class AbdmAbhaClient {
  private readonly logger = new Logger(AbdmAbhaClient.name);

  constructor(
    private readonly config: ExternalIntegrationsConfigService,
    private readonly gatewayClient: AbdmGatewayClient,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  // jscpd:ignore-start
  isConfigured(): boolean {
    return isAbdmConfigured(this.config);
  }
  // jscpd:ignore-end

  /**
   * Request OTP for ABHA login via mobile number.
   * Uses V3 API: POST /v3/profile/login/request/otp
   */
  async requestOtp(
    mobile: string,
  ): Promise<{ txnId: string; maskedTarget: string | null }> {
    const response = await this.postWithAuth(
      'v3/profile/login/request/otp',
      {
        scope: ['abha-login', 'mobile-verify'],
        loginHint: 'mobile',
        loginId: mobile,
        otpSystem: 'abdm',
      },
      { skipAuth: true },
    );
    const body: unknown = await response.json();
    const record = isRecord(body) ? body : {};
    return {
      txnId: typeof record.txnId === 'string' ? record.txnId : '',
      maskedTarget: null,
    };
  }

  /**
   * Verify OTP to complete ABHA login and get profile token.
   * Uses V3 API: POST /v3/profile/login/verify
   */
  async verifyOtp(txnId: string, otp: string): Promise<AbhaVerificationResult> {
    const response = await this.postWithAuth(
      'v3/profile/login/verify',
      {
        authData: {
          authMethods: ['otp'],
          otp: {
            txnId,
            otpValue: otp,
          },
        },
      },
      { tToken: txnId },
    );
    if (!response.ok) {
      return {
        ...NOT_CONFIGURED,
        error: `ABHA_OTP_VERIFY_FAILED_${response.status}`,
      };
    }
    const body: unknown = await response.json();
    const record = isRecord(body) ? body : {};
    const abhaNumber =
      typeof record.abhaNumber === 'string' ? record.abhaNumber : null;

    return {
      verified: true,
      abhaAddress: null,
      abhaNumber,
      kycName: null,
      verifiedAt: this.clock.now().toISOString(),
      error: null,
    };
  }

  private async postWithAuth(
    path: string,
    body: unknown,
    opts?: { skipAuth?: boolean; tToken?: string },
  ): Promise<Response> {
    const abdm = this.config.getAbdmConfig();
    if (!abdm.enabled || !abdm.abhaBaseUrl) {
      throw new Error('ABDM ABHA credentials not configured');
    }
    const url = `${abdm.abhaBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    const headers = abdmBaseHeaders(this.clock);
    if (!opts?.skipAuth) {
      const accessToken = await this.gatewayClient.getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (opts?.tToken) {
      headers['T-TOKEN'] = opts.tToken;
    }
    return fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }
}
