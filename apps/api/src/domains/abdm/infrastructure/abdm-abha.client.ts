import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';

const NOT_CONFIGURED: AbhaVerificationResult = {
  verified: false,
  abhaAddress: null,
  abhaNumber: null,
  kycName: null,
  verifiedAt: null,
  error: 'ABDM_NOT_CONFIGURED',
};

@Injectable()
export class AbdmAbhaClient {
  private readonly logger = new Logger(AbdmAbhaClient.name);

  constructor(
    private readonly config: ExternalIntegrationsConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  isConfigured(): boolean {
    return this.config.getAbdmConfig().enabled;
  }

  async searchByMobile(
    mobile: string,
  ): Promise<{ txnId: string; accounts: unknown[] }> {
    const response = await this.post('v2/account/searchByMobile', {
      mobile,
    });
    const body: unknown = await response.json();
    const record = isRecord(body) ? body : {};
    return {
      txnId: typeof record.txnId === 'string' ? record.txnId : '',
      accounts: Array.isArray(record.accounts) ? record.accounts : [],
    };
  }

  async requestOtp(
    txnId: string,
    index: number,
  ): Promise<{ txnId: string; maskedTarget: string | null }> {
    const response = await this.post('v2/account/requestAbhaOtp', {
      txnId,
      index,
    });
    const body: unknown = await response.json();
    const record = isRecord(body) ? body : {};
    return {
      txnId: typeof record.txnId === 'string' ? record.txnId : txnId,
      maskedTarget:
        typeof record.maskedMobile === 'string'
          ? record.maskedMobile
          : typeof record.maskedTarget === 'string'
            ? record.maskedTarget
            : null,
    };
  }

  async verifyOtp(txnId: string, otp: string): Promise<AbhaVerificationResult> {
    const response = await this.post('v2/account/verifyMobileOtp', {
      txnId,
      otp,
    });
    if (!response.ok) {
      return {
        ...NOT_CONFIGURED,
        error: `ABHA_OTP_VERIFY_FAILED_${response.status}`,
      };
    }
    const body: unknown = await response.json();
    const record = isRecord(body) ? body : {};
    const abhaAddress =
      typeof record.healthId === 'string' ? record.healthId : null;
    const abhaNumber =
      typeof record.healthIdNumber === 'string' ? record.healthIdNumber : null;
    const kycName = typeof record.name === 'string' ? record.name : null;

    return {
      verified: true,
      abhaAddress,
      abhaNumber,
      kycName,
      verifiedAt: this.clock.now().toISOString(),
      error: null,
    };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'REQUEST-ID': randomUUID(),
      TIMESTAMP: this.clock.now().toISOString(),
    };
  }

  private async post(path: string, body: unknown): Promise<Response> {
    const abdm = this.config.getAbdmConfig();
    if (!abdm.enabled || !abdm.abhaBaseUrl) {
      throw new Error('ABDM ABHA credentials not configured');
    }
    const url = `${abdm.abhaBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    return fetchWithTimeout(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
  }
}
