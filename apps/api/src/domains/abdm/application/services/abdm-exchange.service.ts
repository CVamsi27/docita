import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  type AbdmCareContext,
  type AbdmCareContextStatus,
  type AbdmCareContextSource,
  type AbdmConsentRequest,
  type AbdmExternalRecord,
  type AbdmGatewayCallback,
  type AbdmOpsInbox,
  type AbdmTransactionStatus,
  type AbdmTransactionType,
  type CreateAbdmCareContextRequest,
  type CreateAbdmConsentRequest,
  jsonValueSchema,
  type JsonValueSchemaType,
} from '@workspace/types';
import { FhirService } from '@/shared/modules/fhir/fhir.service';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import {
  ABDM_REPOSITORY_TOKEN,
  type AbdmPatientLookup,
  type AbdmRepository,
  type AbdmSourceRecord,
} from '@/domains/abdm/core/repositories/abdm.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AbdmCallbackStateService } from '@/domains/abdm/application/services/abdm-callback-state.service';

function toJsonValue(value: unknown): JsonValueSchemaType {
  return jsonValueSchema.parse(JSON.parse(JSON.stringify(value)));
}

function buildCareContextReference(
  sourceType: AbdmCareContextSource,
  sourceId: string,
): string {
  return `DOCITA-${sourceType}-${sourceId}`;
}

function callbackTypeToTransactionType(type: string): AbdmTransactionType {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes('discover')) return 'M2_DISCOVER_CALLBACK';
  if (normalized.includes('link')) return 'M2_LINK_CALLBACK';
  if (normalized.includes('consent')) return 'M3_CONSENT_CALLBACK';
  if (normalized.includes('data')) return 'M2_DATA_REQUEST';
  return 'M2_NOTIFY';
}

function dispatchStatusToTransactionStatus(
  status: 'SUCCEEDED' | 'FAILED' | 'RETRYABLE',
): AbdmTransactionStatus {
  return status;
}

@Injectable()
export class AbdmExchangeService {
  constructor(
    @Inject(ABDM_REPOSITORY_TOKEN)
    private readonly repository: AbdmRepository,
    private readonly fhirService: FhirService,
    private readonly integrationsConfig: ExternalIntegrationsConfigService,
    private readonly gateway: AbdmGatewayClient,
    private readonly callbackState: AbdmCallbackStateService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createCareContext(
    clinicId: string,
    input: CreateAbdmCareContextRequest,
  ): Promise<AbdmCareContext> {
    await this.assertClinicAbdmEnabled(clinicId);
    await this.requireVerifiedAbhaPatient(
      clinicId,
      input.patientId,
      'Verify the patient ABHA before creating ABDM care contexts',
    );

    const source = await this.repository.findSourceRecord(
      clinicId,
      input.sourceType,
      input.sourceId,
    );
    this.assertSourceBelongsToPatient(source, input.patientId);

    const fhirBundle = await this.fhirService.getPatientBundle(
      input.patientId,
      clinicId,
    );
    const careContext = await this.repository.upsertCareContext({
      clinicId,
      patientId: input.patientId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      referenceNumber: buildCareContextReference(
        input.sourceType,
        input.sourceId,
      ),
      display: source.display,
      hiType: source.hiType,
      fhirBundle: toJsonValue(fhirBundle),
    });

    await this.repository.createTransaction({
      clinicId,
      patientId: input.patientId,
      careContextId: careContext.id,
      type: 'M2_GENERATE_CONTEXT',
      direction: 'INTERNAL',
      status: 'SUCCEEDED',
      correlationId: careContext.referenceNumber,
      payload: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        hiType: source.hiType,
        occurredAt: source.occurredAt.toISOString(),
      },
    });

    return careContext;
  }

  listCareContexts(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmCareContext[]> {
    return this.repository.listCareContexts(clinicId, patientId);
  }

  async requestCareContextLink(
    clinicId: string,
    careContextId: string,
  ): Promise<AbdmCareContext> {
    await this.assertClinicAbdmEnabled(clinicId);
    return this.requestCareContextGatewayAction(clinicId, careContextId, {
      transactionType: 'M2_LINK_CONTEXT',
      nextStatus: 'LINK_REQUESTED',
    });
  }

  async requestCareContextShare(
    clinicId: string,
    careContextId: string,
  ): Promise<AbdmCareContext> {
    await this.assertClinicAbdmEnabled(clinicId);
    return this.requestCareContextGatewayAction(clinicId, careContextId, {
      transactionType: 'M2_DATA_PUSH',
      nextStatus: 'SHARE_REQUESTED',
    });
  }

  private async requestCareContextGatewayAction(
    clinicId: string,
    careContextId: string,
    action: {
      transactionType: AbdmTransactionType;
      nextStatus: AbdmCareContextStatus;
    },
  ): Promise<AbdmCareContext> {
    const selected = await this.findCareContext(clinicId, careContextId);
    const gatewayConfigured = this.integrationsConfig.getAbdmConfig().enabled;
    await this.repository.createTransaction({
      clinicId,
      patientId: selected.patientId,
      careContextId,
      type: action.transactionType,
      direction: 'OUTBOUND',
      status: gatewayConfigured ? 'PENDING' : 'RETRYABLE',
      correlationId: selected.referenceNumber,
      error: gatewayConfigured
        ? undefined
        : 'ABDM gateway credentials not configured',
    });
    return this.repository.updateCareContextStatus(
      clinicId,
      careContextId,
      action.nextStatus,
    );
  }

  async createConsentRequest(
    clinicId: string,
    input: CreateAbdmConsentRequest,
  ): Promise<AbdmConsentRequest> {
    await this.assertClinicAbdmEnabled(clinicId);
    const patient = await this.requireVerifiedAbhaPatient(
      clinicId,
      input.patientId,
      'Verify the patient ABHA before requesting ABDM consent',
    );
    if (patient.abhaAddress !== input.abhaAddress) {
      throw new BadRequestException(
        'Consent ABHA must match the verified patient ABHA',
      );
    }

    const requestId = randomUUID();
    const consent = await this.repository.createConsentRequest(
      clinicId,
      input,
      requestId,
      this.clock.now(),
    );
    const gatewayConfigured = this.gateway.isConfigured();
    const dispatch = gatewayConfigured
      ? await this.gateway.requestConsent({
          requestId,
          abhaAddress: input.abhaAddress,
          purposeCode: input.purposeCode,
          purposeText: input.purposeText,
        })
      : {
          status: 'RETRYABLE' as const,
          error: 'ABDM gateway credentials not configured',
        };
    await this.repository.createTransaction({
      clinicId,
      patientId: input.patientId,
      type: 'M3_CONSENT_REQUEST',
      direction: 'OUTBOUND',
      status: dispatchStatusToTransactionStatus(dispatch.status),
      requestId,
      transactionId: dispatch.transactionId,
      error: dispatch.error,
      payload: {
        purposeCode: input.purposeCode,
        purposeText: input.purposeText,
      },
    });
    return consent;
  }

  async getOpsInbox(clinicId: string): Promise<AbdmOpsInbox> {
    const [
      retryableTransactions,
      failedTransactions,
      consentRequests,
      records,
    ] = await Promise.all([
      this.repository.listTransactions(clinicId, ['RETRYABLE']),
      this.repository.listTransactions(clinicId, ['FAILED']),
      this.repository.listConsentRequests(clinicId),
      this.repository.listExternalRecords(clinicId),
    ]);

    return {
      retryableTransactions,
      failedTransactions,
      pendingConsents: consentRequests.filter(
        (consent) => consent.status === 'REQUESTED',
      ),
      recentExternalRecords: records.slice(0, 20),
    };
  }

  listExternalRecords(
    clinicId: string,
    patientId?: string,
  ): Promise<AbdmExternalRecord[]> {
    return this.repository.listExternalRecords(clinicId, patientId);
  }

  async recordGatewayCallback(
    clinicId: string,
    type: string,
    callback: AbdmGatewayCallback,
  ) {
    await this.assertClinicAbdmEnabled(clinicId);
    const transaction = await this.repository.recordCallback(
      clinicId,
      callbackTypeToTransactionType(type),
      callback,
    );

    if (
      callback.patientId &&
      callback.hiType &&
      callback.payload !== undefined
    ) {
      const payload = jsonValueSchema.safeParse(callback.payload);
      if (payload.success) {
        await this.repository.recordExternalRecord({
          clinicId,
          patientId: callback.patientId,
          sourceHipId: callback.sourceHipId,
          careContextReference: callback.careContextReference,
          hiType: callback.hiType,
          fhirBundle: payload.data,
        });
      }
    }

    await this.callbackState.applyCallbackState(clinicId, type, callback);

    return transaction;
  }

  private assertSourceBelongsToPatient(
    source: AbdmSourceRecord | null,
    patientId: string,
  ): asserts source is AbdmSourceRecord {
    if (!source) {
      throw new NotFoundException('Finalized source record not found');
    }
    if (source.patientId !== patientId) {
      throw new BadRequestException(
        'Care-context source does not belong to this patient',
      );
    }
  }

  private async assertClinicAbdmEnabled(clinicId: string): Promise<void> {
    if (await this.repository.isClinicAbdmEnabled(clinicId)) return;
    throw new ServiceUnavailableException({
      message:
        'ABDM is turned off for this facility. Enable ABDM in settings after credentials are available.',
      code: 'ABDM_TENANT_DISABLED',
    });
  }

  private async requireVerifiedAbhaPatient(
    clinicId: string,
    patientId: string,
    notVerifiedMessage: string,
  ): Promise<AbdmPatientLookup> {
    const patient = await this.repository.findPatient(clinicId, patientId);
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (!patient.abhaAddress || !patient.abhaVerifiedAt) {
      throw new BadRequestException(notVerifiedMessage);
    }
    return patient;
  }

  private async findCareContext(clinicId: string, careContextId: string) {
    const context = await this.repository.findCareContext(
      clinicId,
      careContextId,
    );
    if (!context) {
      throw new NotFoundException('ABDM care context not found');
    }
    return context;
  }
}
