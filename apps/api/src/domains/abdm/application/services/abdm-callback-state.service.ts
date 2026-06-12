import { Inject, Injectable } from '@nestjs/common';
import {
  type AbdmGatewayCallback,
  type AbdmTransactionStatus,
  jsonValueSchema,
  type JsonValueSchemaType,
} from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import {
  ABDM_REPOSITORY_TOKEN,
  type AbdmRepository,
} from '@/domains/abdm/core/repositories/abdm.repository.interface';

function toJsonValue(value: unknown): JsonValueSchemaType {
  return jsonValueSchema.parse(JSON.parse(JSON.stringify(value)));
}

function dispatchStatusToTransactionStatus(
  status: 'SUCCEEDED' | 'FAILED' | 'RETRYABLE',
): AbdmTransactionStatus {
  return status;
}

function callbackPayload(callback: AbdmGatewayCallback) {
  return isRecord(callback.payload) ? callback.payload : {};
}

function callbackString(
  callback: AbdmGatewayCallback,
  key: string,
): string | undefined {
  const payloadValue = callbackPayload(callback)[key];
  return typeof payloadValue === 'string' ? payloadValue : undefined;
}

function callbackLooksSuccessful(callback: AbdmGatewayCallback): boolean {
  const normalized = (callback.status ?? '').trim().toLowerCase();
  return ['ok', 'success', 'succeeded', 'granted', 'linked'].includes(
    normalized,
  );
}

@Injectable()
export class AbdmCallbackStateService {
  constructor(
    @Inject(ABDM_REPOSITORY_TOKEN)
    private readonly repository: AbdmRepository,
    private readonly gateway: AbdmGatewayClient,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async applyCallbackState(
    clinicId: string,
    type: string,
    callback: AbdmGatewayCallback,
  ) {
    const normalizedType = type.trim().toLowerCase();
    if (normalizedType.includes('consent')) {
      await this.repository.updateConsentFromCallback({
        clinicId,
        requestId: callback.requestId,
        consentId: callbackString(callback, 'consentId'),
        artefactId: callbackString(callback, 'artefactId'),
        status: callbackLooksSuccessful(callback) ? 'GRANTED' : 'FAILED',
        rawArtifact: toJsonValue(callback.payload ?? {}),
        at: this.clock.now(),
      });
    }

    if (normalizedType.includes('link') && callback.careContextReference) {
      const context = await this.repository.findCareContextByReference(
        clinicId,
        callback.careContextReference,
      );
      if (context && callbackLooksSuccessful(callback)) {
        await this.repository.markCareContextLinked(
          clinicId,
          context.id,
          this.clock.now(),
        );
      }
    }

    if (callback.dataPushUrl && callback.careContextReference) {
      await this.dispatchDataPushFromCallback(clinicId, callback);
    }
  }

  private async dispatchDataPushFromCallback(
    clinicId: string,
    callback: AbdmGatewayCallback,
  ) {
    if (!callback.dataPushUrl || !callback.careContextReference) return;
    const context = await this.repository.findCareContextByReference(
      clinicId,
      callback.careContextReference,
    );
    if (!context) {
      await this.repository.createTransaction({
        clinicId,
        patientId: callback.patientId,
        type: 'M2_DATA_PUSH',
        direction: 'OUTBOUND',
        status: 'FAILED',
        requestId: callback.requestId,
        transactionId: callback.transactionId,
        correlationId: callback.careContextReference,
        error: 'ABDM care context not found for data push',
      });
      return;
    }

    const payload = jsonValueSchema.safeParse(callback.payload);
    const dispatch = await this.gateway.pushHealthInformation({
      dataPushUrl: callback.dataPushUrl,
      transactionId: callback.transactionId,
      careContextReference: context.referenceNumber,
      hiType: context.hiType,
      encryptionMaterial: payload.success ? payload.data : undefined,
    });
    await this.repository.createTransaction({
      clinicId,
      patientId: context.patientId,
      careContextId: context.id,
      type: 'M2_DATA_PUSH',
      direction: 'OUTBOUND',
      status: dispatchStatusToTransactionStatus(dispatch.status),
      requestId: callback.requestId,
      transactionId: dispatch.transactionId ?? callback.transactionId,
      correlationId: context.referenceNumber,
      error: dispatch.error,
    });

    if (dispatch.status !== 'SUCCEEDED') return;

    await this.repository.markCareContextShared(
      clinicId,
      context.id,
      this.clock.now(),
    );
    const notify = await this.gateway.notifyHealthInformation({
      transactionId: callback.transactionId,
      careContextReference: context.referenceNumber,
      status: 'TRANSFERRED',
    });
    await this.repository.createTransaction({
      clinicId,
      patientId: context.patientId,
      careContextId: context.id,
      type: 'M2_NOTIFY',
      direction: 'OUTBOUND',
      status: dispatchStatusToTransactionStatus(notify.status),
      requestId: callback.requestId,
      transactionId: notify.transactionId ?? callback.transactionId,
      correlationId: context.referenceNumber,
      error: notify.error,
    });
  }
}
