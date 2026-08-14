import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AbdmGatewayCallback } from '@workspace/types';
import type { AbdmGatewayClient } from '@/domains/abdm/infrastructure/abdm-gateway.client';
import type { AbdmRepository } from '@/domains/abdm/core/repositories/abdm.repository.interface';
import { AbdmCallbackStateService } from './abdm-callback-state.service';

describe('AbdmCallbackStateService', () => {
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
  const gateway = {
    pushHealthInformation: jest.fn(),
    notifyHealthInformation: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<AbdmGatewayClient, 'pushHealthInformation' | 'notifyHealthInformation'>
  >;
  const clock = { now: () => new Date('2026-06-12T00:00:00.000Z') };

  const service = new AbdmCallbackStateService(
    repository,
    gateway as unknown as AbdmGatewayClient,
    clock,
  );

  const careContext = {
    id: 'ctx-1',
    patientId: 'patient-1',
    sourceType: 'PRESCRIPTION' as const,
    sourceId: 'rx-1',
    referenceNumber: 'DOCITA-PRESCRIPTION-rx-1',
    display: 'Prescription 2026-06-12',
    hiType: 'Prescription',
    status: 'READY' as const,
    linkedAt: null,
    lastSharedAt: null,
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.updateConsentFromCallback.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      abhaAddress: 'asha.verma@abdm',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
      status: 'GRANTED',
      requestId: 'req-1',
      consentId: 'consent-1',
      artefactId: 'artefact-1',
      requestedAt: '2026-06-12T00:00:00.000Z',
      grantedAt: '2026-06-12T00:00:00.000Z',
      expiresAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    repository.findCareContextByReference.mockResolvedValue({
      ...careContext,
      fhirBundle: { resourceType: 'Bundle', type: 'collection' },
    });
    repository.markCareContextLinked.mockResolvedValue({
      ...careContext,
      status: 'LINKED',
      linkedAt: clock.now().toISOString(),
    });
    repository.markCareContextShared.mockResolvedValue({
      ...careContext,
      status: 'SHARED',
      lastSharedAt: clock.now().toISOString(),
    });
    repository.createTransaction.mockResolvedValue({
      id: 'tx-1',
      patientId: 'patient-1',
      careContextId: 'ctx-1',
      type: 'M2_DATA_PUSH',
      direction: 'OUTBOUND',
      status: 'SUCCEEDED',
      requestId: null,
      transactionId: null,
      correlationId: null,
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    gateway.pushHealthInformation.mockResolvedValue({
      status: 'SUCCEEDED',
      transactionId: 'push-1',
    });
    gateway.notifyHealthInformation.mockResolvedValue({
      status: 'SUCCEEDED',
      transactionId: 'notify-1',
    });
  });

  describe('consent callbacks', () => {
    it('marks consent GRANTED from a successful callback payload', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-1',
        status: 'SUCCEEDED',
        payload: { consentId: 'consent-1', artefactId: 'artefact-1' },
      };

      await service.applyCallbackState('clinic-1', 'CONSENT-GRANTED', callback);

      expect(repository.updateConsentFromCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          requestId: 'req-1',
          consentId: 'consent-1',
          artefactId: 'artefact-1',
          status: 'GRANTED',
          at: clock.now(),
        }),
      );
      // TS2589: JsonValueSchemaType is recursive; asserting the literal
      // inside toHaveBeenCalledWith triggers excessive type instantiation.
      const consentUpdate =
        repository.updateConsentFromCallback.mock.calls[0]?.[0];
      expect(consentUpdate?.rawArtifact).toEqual({
        consentId: 'consent-1',
        artefactId: 'artefact-1',
      });
    });

    it('marks consent FAILED when the callback status is not successful', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-1',
        status: 'DENIED',
        payload: { consentId: 'consent-1' },
      };

      await service.applyCallbackState('clinic-1', 'consent', callback);

      expect(repository.updateConsentFromCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' }),
      );
    });

    it('treats a missing or non-string payload field as absent', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-1',
        status: 'granted',
      };

      await service.applyCallbackState('clinic-1', 'consent', callback);

      expect(repository.updateConsentFromCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          requestId: 'req-1',
          consentId: undefined,
          artefactId: undefined,
          status: 'GRANTED',
          at: clock.now(),
        }),
      );
      // TS2589: JsonValueSchemaType is recursive; asserting the literal
      // inside toHaveBeenCalledWith triggers excessive type instantiation.
      const consentUpdate =
        repository.updateConsentFromCallback.mock.calls[0]?.[0];
      expect(consentUpdate?.rawArtifact).toEqual({});
    });
  });

  describe('link callbacks', () => {
    it('links the care context when the callback references one and succeeds', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-2',
        careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
        status: 'LINKED',
      };

      await service.applyCallbackState('clinic-1', 'link-granted', callback);

      expect(repository.findCareContextByReference).toHaveBeenCalledWith(
        'clinic-1',
        'DOCITA-PRESCRIPTION-rx-1',
      );
      expect(repository.markCareContextLinked).toHaveBeenCalledWith(
        'clinic-1',
        'ctx-1',
        clock.now(),
      );
    });

    it('does not link when the care context is unknown', async () => {
      repository.findCareContextByReference.mockResolvedValue(null);
      const callback: AbdmGatewayCallback = {
        requestId: 'req-2',
        careContextReference: 'DOCITA-PRESCRIPTION-unknown',
        status: 'LINKED',
      };

      await service.applyCallbackState('clinic-1', 'link', callback);

      expect(repository.markCareContextLinked).not.toHaveBeenCalled();
    });

    it('does not link when the callback status is not successful', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-2',
        careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
        status: 'FAILED',
      };

      await service.applyCallbackState('clinic-1', 'link', callback);

      expect(repository.findCareContextByReference).toHaveBeenCalledWith(
        'clinic-1',
        'DOCITA-PRESCRIPTION-rx-1',
      );
      expect(repository.markCareContextLinked).not.toHaveBeenCalled();
    });

    it('skips the link branch entirely without a care-context reference', async () => {
      const callback: AbdmGatewayCallback = {
        requestId: 'req-2',
        status: 'LINKED',
      };

      await service.applyCallbackState('clinic-1', 'link', callback);

      expect(repository.findCareContextByReference).not.toHaveBeenCalled();
    });
  });

  describe('data-push callbacks', () => {
    const dataPushCallback: AbdmGatewayCallback = {
      requestId: 'req-3',
      transactionId: 'txn-3',
      patientId: 'patient-1',
      careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
      dataPushUrl: 'https://abdm.example/data-push',
      hiType: 'Prescription',
      status: 'REQUESTED',
      payload: { checksum: 'abc', encryptedContent: 'xyz' },
    };

    it('records a FAILED transaction when the care context is unknown', async () => {
      repository.findCareContextByReference.mockResolvedValue(null);

      await service.applyCallbackState('clinic-1', 'data-request', {
        ...dataPushCallback,
        patientId: undefined,
      });

      expect(repository.createTransaction).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
        patientId: undefined,
        type: 'M2_DATA_PUSH',
        direction: 'OUTBOUND',
        status: 'FAILED',
        requestId: 'req-3',
        transactionId: 'txn-3',
        correlationId: 'DOCITA-PRESCRIPTION-rx-1',
        error: 'ABDM care context not found for data push',
      });
      expect(gateway.pushHealthInformation).not.toHaveBeenCalled();
    });

    it('pushes health information, records the push, then notifies on success', async () => {
      await service.applyCallbackState('clinic-1', 'data-request', {
        ...dataPushCallback,
        patientId: 'patient-1',
      });

      expect(gateway.pushHealthInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          dataPushUrl: 'https://abdm.example/data-push',
          transactionId: 'txn-3',
          careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
          hiType: 'Prescription',
        }),
      );
      // TS2589: JsonValueSchemaType is recursive; asserting the literal
      // inside toHaveBeenCalledWith triggers excessive type instantiation.
      const pushCall = gateway.pushHealthInformation.mock.calls[0]?.[0];
      expect(pushCall?.encryptionMaterial).toEqual({
        checksum: 'abc',
        encryptedContent: 'xyz',
      });
      expect(repository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          patientId: 'patient-1',
          careContextId: 'ctx-1',
          type: 'M2_DATA_PUSH',
          direction: 'OUTBOUND',
          status: 'SUCCEEDED',
          transactionId: 'push-1',
          correlationId: 'DOCITA-PRESCRIPTION-rx-1',
        }),
      );
      expect(repository.markCareContextShared).toHaveBeenCalledWith(
        'clinic-1',
        'ctx-1',
        clock.now(),
      );
      expect(gateway.notifyHealthInformation).toHaveBeenCalledWith({
        transactionId: 'txn-3',
        careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
        status: 'TRANSFERRED',
      });
      expect(repository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'M2_NOTIFY',
          status: 'SUCCEEDED',
          transactionId: 'notify-1',
        }),
      );
    });

    it('skips notify/shared when the push is retryable', async () => {
      gateway.pushHealthInformation.mockResolvedValue({
        status: 'RETRYABLE',
        error: 'ABDM_ENCRYPTION_MATERIAL_REQUIRED',
      });

      await service.applyCallbackState('clinic-1', 'data-request', {
        ...dataPushCallback,
        patientId: 'patient-1',
      });

      expect(repository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'M2_DATA_PUSH',
          status: 'RETRYABLE',
          transactionId: 'txn-3',
          error: 'ABDM_ENCRYPTION_MATERIAL_REQUIRED',
        }),
      );
      expect(repository.markCareContextShared).not.toHaveBeenCalled();
      expect(gateway.notifyHealthInformation).not.toHaveBeenCalled();
    });

    it('skips the data-push branch without a data push URL', async () => {
      await service.applyCallbackState('clinic-1', 'data-request', {
        ...dataPushCallback,
        dataPushUrl: undefined,
      });

      expect(repository.findCareContextByReference).not.toHaveBeenCalled();
      expect(gateway.pushHealthInformation).not.toHaveBeenCalled();
    });
  });
});
