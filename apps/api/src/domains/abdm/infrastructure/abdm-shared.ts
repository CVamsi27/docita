import { randomUUID } from 'crypto';
import type { AbhaVerificationResult } from '@workspace/types';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';

export const NOT_CONFIGURED: AbhaVerificationResult = {
  verified: false,
  abhaAddress: null,
  abhaNumber: null,
  kycName: null,
  verifiedAt: null,
  error: 'ABDM_NOT_CONFIGURED',
};

export function isAbdmConfigured(
  config: ExternalIntegrationsConfigService,
): boolean {
  return config.getAbdmConfig().enabled;
}

export function abdmBaseHeaders(clock: IClock): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'REQUEST-ID': randomUUID(),
    TIMESTAMP: clock.now().toISOString(),
  };
}

export function abdmGatewayHeaders(
  clock: IClock,
  baseUrl: string,
): Record<string, string> {
  return {
    ...abdmBaseHeaders(clock),
    'X-CM-ID': baseUrl.includes('dev.abdm.gov.in') ? 'sbx' : 'abdm',
  };
}
