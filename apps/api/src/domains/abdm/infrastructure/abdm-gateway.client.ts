import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AbhaVerificationResult,
  JsonValueSchemaType,
  VerifyAbhaRequest,
} from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { assertSafeExternalUrl } from '@/shared/common/http/safe-external-url';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';

interface AbdmGatewayDispatchResult {
  status: 'SUCCEEDED' | 'FAILED' | 'RETRYABLE';
  transactionId?: string;
  error?: string;
}

interface AbdmDataPushInput {
  dataPushUrl: string;
  transactionId?: string;
  careContextReference: string;
  hiType: string;
  encryptionMaterial?: JsonValueSchemaType;
}

const NOT_CONFIGURED: AbhaVerificationResult = {
  verified: false,
  abhaAddress: null,
  abhaNumber: null,
  kycName: null,
  verifiedAt: null,
  error: 'ABDM_NOT_CONFIGURED',
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function gatewayRoot(baseUrl: string): string {
  return normalizeBaseUrl(baseUrl).replace(/\/api\/hiecm\/gateway\/v3$/, '');
}

function gatewayUrl(baseUrl: string, path: string): string {
  const root = gatewayRoot(baseUrl);
  if (path.startsWith('data-flow/')) {
    return `${root}/api/hiecm/${path}`;
  }
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.endsWith('/api/hiecm/gateway/v3')) {
    return `${normalized}/${path.replace(/^\/+/, '')}`;
  }
  return `${root}/api/hiecm/gateway/v3/${path.replace(/^\/+/, '')}`;
}

function extractAccessToken(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.accessToken === 'string') return value.accessToken;
  if (typeof value.token === 'string') return value.token;
  if (typeof value.access_token === 'string') return value.access_token;
  return null;
}

function responseCodeError(prefix: string, status: number): string {
  if (status === 401) return `${prefix}_INVALID_CREDENTIALS`;
  if (status === 403) return `${prefix}_NOT_CERTIFIED`;
  if (status === 404) return `${prefix}_NOT_FOUND`;
  return `${prefix}_${status}`;
}

@Injectable()
export class AbdmGatewayClient {
  private readonly logger = new Logger(AbdmGatewayClient.name);
  private sessionToken: { accessToken: string; expiresAt: number } | null =
    null;

  constructor(
    private readonly config: ExternalIntegrationsConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  isConfigured(): boolean {
    return this.config.getAbdmConfig().enabled;
  }

  async verifyAbha(input: VerifyAbhaRequest): Promise<AbhaVerificationResult> {
    const abdm = this.config.getAbdmConfig();
    if (!abdm.enabled || !abdm.baseUrl) return NOT_CONFIGURED;

    try {
      const response = await this.postGateway('abha/verify', {
        healthIdNumber: input.abhaNumber,
        healthId: input.abhaAddress,
      });
      if (!response.ok) {
        return {
          ...NOT_CONFIGURED,
          error: responseCodeError('ABDM_VERIFY_FAILED', response.status),
        };
      }
      const body: unknown = await response.json();
      return this.toVerificationResult(input, body);
    } catch (error) {
      this.logger.warn(
        `ABDM verify failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ...NOT_CONFIGURED, error: 'ABDM_VERIFY_ERROR' };
    }
  }

  async requestConsent(input: {
    requestId: string;
    abhaAddress: string;
    purposeCode: string;
    purposeText: string;
  }): Promise<AbdmGatewayDispatchResult> {
    try {
      const response = await this.postGateway('consent-requests/init', {
        requestId: input.requestId,
        patient: { id: input.abhaAddress },
        purpose: {
          code: input.purposeCode,
          text: input.purposeText,
        },
      });
      return this.toDispatchResult(response, 'ABDM_CONSENT_REQUEST_FAILED');
    } catch (error) {
      return this.toDispatchError(error, 'ABDM_CONSENT_REQUEST_ERROR');
    }
  }

  async notifyHealthInformation(input: {
    transactionId?: string;
    careContextReference: string;
    status: 'TRANSFERRED' | 'FAILED';
    description?: string;
  }): Promise<AbdmGatewayDispatchResult> {
    try {
      const response = await this.postGateway(
        'data-flow/v3/health-information/notify',
        {
          transactionId: input.transactionId,
          statusNotification: {
            sessionStatus: input.status,
            statusResponses: [
              {
                careContextReference: input.careContextReference,
                hiStatus: input.status === 'TRANSFERRED' ? 'OK' : 'ERRORED',
                description: input.description ?? input.status,
              },
            ],
          },
        },
      );
      return this.toDispatchResult(response, 'ABDM_NOTIFY_FAILED');
    } catch (error) {
      return this.toDispatchError(error, 'ABDM_NOTIFY_ERROR');
    }
  }

  async pushHealthInformation(
    input: AbdmDataPushInput,
  ): Promise<AbdmGatewayDispatchResult> {
    const encryption = this.extractEncryptionEvidence(input.encryptionMaterial);
    if (!encryption) {
      return {
        status: 'RETRYABLE',
        error: 'ABDM_ENCRYPTION_MATERIAL_REQUIRED',
      };
    }

    try {
      const url = assertSafeExternalUrl(input.dataPushUrl);
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: input.transactionId,
          entries: [
            {
              careContextReference: input.careContextReference,
              hiType: input.hiType,
              content: encryption.encryptedContent,
              media: 'application/fhir+json',
              checksum: encryption.checksum,
              keyMaterial: encryption.keyMaterial,
            },
          ],
        }),
      });
      return this.toDispatchResult(response, 'ABDM_DATA_PUSH_FAILED');
    } catch (error) {
      return this.toDispatchError(error, 'ABDM_DATA_PUSH_ERROR');
    }
  }

  private async postGateway(path: string, body: unknown): Promise<Response> {
    const abdm = this.config.getAbdmConfig();
    if (!abdm.enabled || !abdm.baseUrl) {
      throw new Error('ABDM gateway credentials not configured');
    }
    const accessToken = await this.getSessionToken(abdm.baseUrl);
    return fetchWithTimeout(gatewayUrl(abdm.baseUrl, path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CM-ID': abdm.baseUrl.includes('dev.abdm.gov.in') ? 'sbx' : 'abdm',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  private async getSessionToken(baseUrl: string): Promise<string> {
    const now = this.clock.now().getTime();
    if (this.sessionToken && this.sessionToken.expiresAt > now + 30_000) {
      return this.sessionToken.accessToken;
    }

    const abdm = this.config.getAbdmConfig();
    if (!abdm.clientId || !abdm.clientSecret) {
      throw new Error('ABDM gateway credentials not configured');
    }

    const response = await fetchWithTimeout(gatewayUrl(baseUrl, 'sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CM-ID': baseUrl.includes('dev.abdm.gov.in') ? 'sbx' : 'abdm',
      },
      body: JSON.stringify({
        clientId: abdm.clientId,
        clientSecret: abdm.clientSecret,
      }),
    });
    if (!response.ok) {
      throw new Error(
        responseCodeError('ABDM_SESSION_FAILED', response.status),
      );
    }
    const accessToken = extractAccessToken(await response.json());
    if (!accessToken) {
      throw new Error('ABDM_SESSION_TOKEN_MISSING');
    }
    this.sessionToken = {
      accessToken,
      expiresAt: now + 4 * 60 * 1000,
    };
    return accessToken;
  }

  private toVerificationResult(
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

  private async toDispatchResult(
    response: Response,
    errorPrefix: string,
  ): Promise<AbdmGatewayDispatchResult> {
    if (!response.ok) {
      return {
        status: response.status >= 500 ? 'RETRYABLE' : 'FAILED',
        error: responseCodeError(errorPrefix, response.status),
      };
    }
    let transactionId: string | undefined;
    try {
      const body: unknown = await response.json();
      if (isRecord(body) && typeof body.transactionId === 'string') {
        transactionId = body.transactionId;
      }
    } catch {
      transactionId = undefined;
    }
    return { status: 'SUCCEEDED', transactionId };
  }

  private toDispatchError(
    error: unknown,
    fallback: string,
  ): AbdmGatewayDispatchResult {
    return {
      status: 'RETRYABLE',
      error: error instanceof Error ? error.message : fallback,
    };
  }

  private extractEncryptionEvidence(value: JsonValueSchemaType | undefined) {
    if (!isRecord(value)) return null;
    const keyMaterial = value.keyMaterial;
    const checksum = value.checksum;
    const encryptedContent = value.encryptedContent;
    if (
      !isRecord(keyMaterial) ||
      typeof checksum !== 'string' ||
      typeof encryptedContent !== 'string'
    ) {
      return null;
    }
    return { encryptedContent, keyMaterial, checksum };
  }
}
