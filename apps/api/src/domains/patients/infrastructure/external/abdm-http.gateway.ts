import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import type { IAbdmGateway } from '@/domains/patients/core/ports/abha-verification.port';

const NOT_CONFIGURED: AbhaVerificationResult = {
  verified: false,
  abhaAddress: null,
  abhaNumber: null,
  kycName: null,
  verifiedAt: null,
  error: 'ABDM_NOT_CONFIGURED',
};

/**
 * ABDM gateway adapter for ABHA verification (M1).
 *
 * Until ABDM credentials are configured (sandbox or production), {@link isConfigured}
 * is false and {@link verifyAbha} returns `ABDM_NOT_CONFIGURED` — the endpoint
 * surfaces a clear "not enabled" state rather than failing. Once
 * `ABDM_BASE_URL` / `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` are set, it performs
 * the live verification call. The exact ABDM endpoint path and request/response
 * shape must be confirmed against the ABDM sandbox spec at go-live; the parsing
 * below is defensive so an unexpected shape degrades to a failed (not crashed)
 * verification.
 */
@Injectable()
export class AbdmHttpGateway implements IAbdmGateway {
  private readonly logger = new Logger(AbdmHttpGateway.name);

  constructor(
    private readonly config: ExternalIntegrationsConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  isConfigured(): boolean {
    return this.config.getAbdmConfig().enabled;
  }

  async verifyAbha(input: VerifyAbhaRequest): Promise<AbhaVerificationResult> {
    const abdm = this.config.getAbdmConfig();
    if (!abdm.enabled || !abdm.baseUrl) {
      return NOT_CONFIGURED;
    }

    try {
      const response = await fetchWithTimeout(
        `${abdm.baseUrl.replace(/\/$/, '')}/v1/abha/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CM-ID': abdm.clientId ?? '',
            Authorization: `Bearer ${abdm.clientSecret ?? ''}`,
          },
          body: JSON.stringify({
            healthIdNumber: input.abhaNumber,
            healthId: input.abhaAddress,
          }),
        },
      );

      if (!response.ok) {
        return {
          ...NOT_CONFIGURED,
          error: `ABDM_VERIFY_FAILED_${response.status}`,
        };
      }

      const body: unknown = await response.json();
      return this.toResult(input, body);
    } catch (error) {
      this.logger.warn(
        `ABDM verify failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ...NOT_CONFIGURED, error: 'ABDM_VERIFY_ERROR' };
    }
  }

  private toResult(
    input: VerifyAbhaRequest,
    body: unknown,
  ): AbhaVerificationResult {
    const record = isRecord(body) ? body : {};
    const abhaNumber =
      typeof record.healthIdNumber === 'string'
        ? record.healthIdNumber
        : (input.abhaNumber ?? null);
    const abhaAddress =
      typeof record.healthId === 'string'
        ? record.healthId
        : (input.abhaAddress ?? null);
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
}
