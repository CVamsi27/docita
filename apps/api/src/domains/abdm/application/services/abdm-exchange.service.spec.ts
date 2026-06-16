import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { FhirService } from '@/shared/modules/fhir/fhir.service';
import type { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import type { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import type { AbdmRepository } from '@/domains/abdm/core/repositories/abdm.repository.interface';
import { AbdmExchangeService } from './abdm-exchange.service';
import { AbdmCallbackStateService } from './abdm-callback-state.service';

describe('AbdmExchangeService', () => {
  const repository = {
    isClinicAbdmEnabled: jest.fn(),
    findPatient: jest.fn(),
    findSourceRecord: jest.fn(),
    upsertCareContext: jest.fn(),
    listCareContexts: jest.fn(),
    findCareContext: jest.fn(),
    findCareContextByReference: jest.fn(),
    markCareContextLinked: jest.fn(),
    markCareContextShared: jest.fn(),
    updateCareContextStatus: jest.fn(),
    createTransaction: jest.fn(),
    listTransactions: jest.fn(),
    createConsentRequest: jest.fn(),
    listConsentRequests: jest.fn(),
    updateConsentFromCallback: jest.fn(),
    recordCallback: jest.fn(),
    recordExternalRecord: jest.fn(),
    listExternalRecords: jest.fn(),
  } as unknown as jest.Mocked<AbdmRepository>;
  const fhirService = {
    getPatientBundle: jest.fn(),
  } as unknown as jest.Mocked<Pick<FhirService, 'getPatientBundle'>>;
  const integrationsConfig = {
    getAbdmConfig: jest.fn(),
  } as unknown as jest.Mocked<ExternalIntegrationsConfigService>;
  const gateway = {
    isConfigured: jest.fn(),
    requestConsent: jest.fn(),
    pushHealthInformation: jest.fn(),
    notifyHealthInformation: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      AbdmGatewayClient,
      | 'isConfigured'
      | 'requestConsent'
      | 'pushHealthInformation'
      | 'notifyHealthInformation'
    >
  >;
  const clock = { now: () => new Date('2026-06-12T00:00:00.000Z') };
  const callbackState = new AbdmCallbackStateService(
    repository,
    gateway as unknown as AbdmGatewayClient,
    clock,
  );

  const service = new AbdmExchangeService(
    repository,
    fhirService as unknown as FhirService,
    integrationsConfig,
    gateway as unknown as AbdmGatewayClient,
    callbackState,
    clock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.isClinicAbdmEnabled.mockResolvedValue(true);
    repository.findPatient.mockResolvedValue({
      id: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      abhaVerifiedAt: new Date('2026-06-12T00:00:00.000Z'),
    });
    repository.findSourceRecord.mockResolvedValue({
      patientId: 'patient-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      occurredAt: new Date('2026-06-12T00:00:00.000Z'),
    });
    fhirService.getPatientBundle.mockResolvedValue({
      resourceType: 'Bundle',
      id: 'bundle-1',
      type: 'collection',
      timestamp: '2026-06-12T00:00:00.000Z',
      total: 1,
      entry: [],
    });
    repository.upsertCareContext.mockResolvedValue({
      id: 'ctx-1',
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
      referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      status: 'READY',
      linkedAt: null,
      lastSharedAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    repository.createTransaction.mockResolvedValue({
      id: 'tx-1',
      patientId: 'patient-1',
      careContextId: 'ctx-1',
      type: 'M2_GENERATE_CONTEXT',
      direction: 'INTERNAL',
      status: 'SUCCEEDED',
      requestId: null,
      transactionId: null,
      correlationId: 'DOCITA-PRESCRIPTION-rx-1',
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    repository.createConsentRequest.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
      status: 'REQUESTED',
      requestId: 'request-1',
      consentId: null,
      artefactId: null,
      requestedAt: '2026-06-12T00:00:00.000Z',
      grantedAt: null,
      expiresAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    integrationsConfig.getAbdmConfig.mockReturnValue({
      baseUrl: null,
      clientId: null,
      clientSecret: null,
      callbackSecret: null,
      abhaBaseUrl: 'https://abhasbx.abdm.gov.in',
      abhaPublicKey: null,
      isSandbox: false,
      enabled: false,
    });
    gateway.isConfigured.mockReturnValue(false);
    gateway.requestConsent.mockResolvedValue({
      status: 'SUCCEEDED',
      transactionId: 'txn-1',
    });
    gateway.pushHealthInformation.mockResolvedValue({
      status: 'RETRYABLE',
      error: 'ABDM_ENCRYPTION_MATERIAL_REQUIRED',
    });
    gateway.notifyHealthInformation.mockResolvedValue({
      status: 'SUCCEEDED',
      transactionId: 'notify-1',
    });
  });

  it('creates a care context and internal M2 transaction for a verified ABHA patient', async () => {
    const result = await service.createCareContext('clinic-1', {
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
    });

    expect(result.id).toBe('ctx-1');
    expect(repository.upsertCareContext).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
        hiType: 'Prescription',
      }),
    );
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'M2_GENERATE_CONTEXT',
        status: 'SUCCEEDED',
        careContextId: 'ctx-1',
      }),
    );
  });

  it('blocks care-context creation until ABHA is verified', async () => {
    repository.findPatient.mockResolvedValueOnce({
      id: 'patient-1',
      abhaAddress: null,
      abhaVerifiedAt: null,
    });

    await expect(
      service.createCareContext('clinic-1', {
        patientId: 'patient-1',
        sourceType: 'PRESCRIPTION',
        sourceId: 'rx-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsertCareContext).not.toHaveBeenCalled();
  });

  it('blocks care-context creation when ABDM is disabled for the clinic', async () => {
    repository.isClinicAbdmEnabled.mockResolvedValue(false);

    await expect(
      service.createCareContext('clinic-1', {
        patientId: 'patient-1',
        sourceType: 'PRESCRIPTION',
        sourceId: 'rx-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.findPatient).not.toHaveBeenCalled();
    expect(repository.upsertCareContext).not.toHaveBeenCalled();
  });

  it('records M3 consent as retryable when the ABDM gateway is not configured', async () => {
    await service.createConsentRequest('clinic-1', {
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
    });

    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'M3_CONSENT_REQUEST',
        direction: 'OUTBOUND',
        status: 'RETRYABLE',
        error: 'ABDM gateway credentials not configured',
      }),
    );
  });

  it('dispatches M3 consent to ABDM when the gateway is configured', async () => {
    gateway.isConfigured.mockReturnValueOnce(true);

    await service.createConsentRequest('clinic-1', {
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
    });

    expect(gateway.requestConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        abhaAddress: 'asha.verma@abdm',
        purposeCode: 'CAREMGT',
      }),
    );
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'M3_CONSENT_REQUEST',
        status: 'SUCCEEDED',
        transactionId: 'txn-1',
      }),
    );
  });

  it('records data push as retryable when encrypted ABDM material is missing', async () => {
    repository.recordCallback.mockResolvedValue({
      id: 'tx-callback',
      patientId: 'patient-1',
      careContextId: 'ctx-1',
      type: 'M2_DATA_REQUEST',
      direction: 'INBOUND',
      status: 'ACKNOWLEDGED',
      requestId: 'req-1',
      transactionId: 'txn-1',
      correlationId: 'DOCITA-PRESCRIPTION-rx-1',
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    repository.findCareContextByReference.mockResolvedValue({
      id: 'ctx-1',
      patientId: 'patient-1',
      sourceType: 'PRESCRIPTION',
      sourceId: 'rx-1',
      referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
      display: 'Prescription 2026-06-12',
      hiType: 'Prescription',
      status: 'READY',
      linkedAt: null,
      lastSharedAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      fhirBundle: {
        resourceType: 'Bundle',
        type: 'collection',
      },
    });

    await service.recordGatewayCallback('clinic-1', 'data-request', {
      requestId: 'req-1',
      transactionId: 'txn-1',
      patientId: 'patient-1',
      careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
      dataPushUrl: 'https://abdm.example/data-push',
      hiType: 'Prescription',
      status: 'REQUESTED',
      payload: {},
    });

    expect(gateway.pushHealthInformation).toHaveBeenCalledWith(
      expect.objectContaining({
        dataPushUrl: 'https://abdm.example/data-push',
        careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
      }),
    );
    expect(repository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'M2_DATA_PUSH',
        status: 'RETRYABLE',
        error: 'ABDM_ENCRYPTION_MATERIAL_REQUIRED',
      }),
    );
  });
});
